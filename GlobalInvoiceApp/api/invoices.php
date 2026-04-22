<?php
// api/invoices.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id);
$company_id = $company['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $invoicesTable = t('invoices');
    $clientsTable = t('clients');
    
    $stmt = $conn->prepare("
        SELECT i.id, i.invoice_number, i.status, i.issue_date, i.due_date, i.grand_total,
               c.name AS client_name
        FROM `{$invoicesTable}` i
        LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
        WHERE i.user_id = ? ORDER BY i.created_at DESC
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $invoices = [];
    while ($row = $result->fetch_assoc()) { $invoices[] = $row; }
    $stmt->close();
    echo json_encode(['status' => 'success', 'data' => $invoices]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['status' => 'error', 'message' => 'Invalid data']); exit; }

    $action = $data['action'] ?? 'create';
    $invoicesTable = t('invoices');
    $clientsTable = t('clients');
    $itemsTable = t('invoice_items');

    // ── FETCH SINGLE INVOICE with items & client ──────────────────────────────
    if ($action === 'get') {
        $id = (int)($data['id'] ?? 0);
        $stmt = $conn->prepare("
            SELECT i.*, c.name AS client_name, c.email AS client_email,
                   c.billing_address AS client_address, c.id AS client_id
            FROM `{$invoicesTable}` i LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
            WHERE i.id = ? AND i.user_id = ?
        ");
        $stmt->bind_param("ii", $id, $user_id);
        $stmt->execute();
        $invoice = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$invoice) { echo json_encode(['status' => 'error', 'message' => 'Not found']); exit; }

        $stmt2 = $conn->prepare("SELECT id, description, quantity, unit_price, tax_method, tax_profile_id FROM `{$itemsTable}` WHERE invoice_id = ?");
        $stmt2->bind_param("i", $id);
        $stmt2->execute();
        $result2 = $stmt2->get_result();
        $items = [];
        while ($row = $result2->fetch_assoc()) { $items[] = $row; }
        $stmt2->close();

        $invoice['items'] = $items;
        echo json_encode(['status' => 'success', 'data' => $invoice]);
        exit;
    }

    // ── UPDATE STATUS ─────────────────────────────────────────────────────────
    if ($action === 'update_status') {
        $id = (int)($data['id'] ?? 0);
        $status = $data['status'] ?? '';
        if (!in_array($status, ['Draft','Sent','Paid','Overdue'])) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid status']); exit;
        }
        $stmt = $conn->prepare("UPDATE `{$invoicesTable}` SET status=? WHERE id=? AND user_id=?");
        $stmt->bind_param("sii", $status, $id, $user_id);
        $stmt->execute(); $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Status updated']);
        exit;
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM `{$invoicesTable}` WHERE id=? AND user_id=?");
        $stmt->bind_param("ii", $id, $user_id);
        $stmt->execute(); $stmt->close();
        echo json_encode(['status' => 'success', 'message' => 'Invoice deleted']);
        exit;
    }

    // ── FULL UPDATE (edit draft) ───────────────────────────────────────────────
    if ($action === 'update') {
        $id = (int)($data['id'] ?? 0);
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("
                UPDATE `{$invoicesTable}` SET invoice_number=?, status=?, issue_date=?, due_date=?,
                    subtotal=?, tax_total=?, grand_total=?, notes=?
                WHERE id=? AND user_id=?
            ");
            $stmt->bind_param("ssssdddsii",
                $data['invoice_number'], $data['status'],
                $data['issue_date'], $data['due_date'],
                $data['subtotal'], $data['tax_total'], $data['grand_total'], $data['notes'],
                $id, $user_id
            );
            $stmt->execute(); $stmt->close();

            // Replace items
            $del = $conn->prepare("DELETE FROM `{$itemsTable}` WHERE invoice_id=?");
            $del->bind_param("i", $id); $del->execute(); $del->close();

            if (!empty($data['items'])) {
                $si = $conn->prepare("INSERT INTO `{$itemsTable}` (invoice_id,description,quantity,unit_price,tax_method,tax_profile_id) VALUES (?,?,?,?,?,?)");
                foreach ($data['items'] as $item) {
                    $desc = $item['description']; $qty = (int)$item['quantity'];
                    $price = (float)$item['unit_price'];
                    $meth = $item['tax_method'] ?? 'exclusive';
                    $tax_id = !empty($item['tax_profile_id']) ? (int)$item['tax_profile_id'] : null;
                    $si->bind_param("isidsi", $id, $desc, $qty, $price, $meth, $tax_id);
                    $si->execute();
                }
                $si->close();
            }
            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Invoice updated']);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // ── CREATE NEW INVOICE ─────────────────────────────────────────────────────
    $conn->begin_transaction();
    try {
        $client_id = null;
        if (!empty($data['client']['id'])) {
            $client_id = (int)$data['client']['id'];
        } else {
            $sc = $conn->prepare("INSERT INTO `{$clientsTable}` (user_id, name, email, billing_address) VALUES (?,?,?,?)");
            $sc->bind_param("isss", $user_id, $data['client']['name'], $data['client']['email'], $data['client']['address']);
            $sc->execute(); $client_id = $conn->insert_id; $sc->close();
        }

        $si = $conn->prepare("
            INSERT INTO `{$invoicesTable}` (user_id, client_id, invoice_number, status, issue_date, due_date, subtotal, tax_total, grand_total, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        ");
        $status = 'Draft';
        $si->bind_param("iiissssddd",
            $user_id, $client_id, $data['invoice_number'], $status,
            $data['issue_date'], $data['due_date'],
            $data['subtotal'], $data['tax_total'], $data['grand_total'], $data['notes']
        );
        $si->execute(); $invoice_id = $conn->insert_id; $si->close();

        if (!empty($data['items'])) {
            $sit = $conn->prepare("INSERT INTO `{$itemsTable}` (invoice_id,description,quantity,unit_price,tax_method,tax_profile_id) VALUES (?,?,?,?,?,?)");
            foreach ($data['items'] as $item) {
                $desc = $item['description']; $qty = (int)$item['quantity'];
                $price = (float)$item['unit_price'];
                $meth = $item['tax_method'] ?? 'exclusive';
                $tax_id = !empty($item['tax_profile_id']) ? (int)$item['tax_profile_id'] : null;
                $sit->bind_param("isidsi", $invoice_id, $desc, $qty, $price, $meth, $tax_id);
                $sit->execute();
            }
            $sit->close();
        }
        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Invoice saved', 'invoice_id' => $invoice_id]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>
