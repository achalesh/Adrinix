<?php
// api/invoices.php
require_once 'db.php';

// Auth and Company check moved into the handler block below

function handleInvoicesRequest($conn, $user_id, $company_id) {
    global $t_prefix;
    $invoicesTable = t('invoices');
    $clientsTable = t('clients');
    $itemsTable = t('invoice_items');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $client_id = (int)($_GET['client_id'] ?? 0);
        $where = "WHERE 1=1";
        if ($client_id) {
            $where .= " AND i.client_id = $client_id";
        }
        
        $query = "
            SELECT i.*, c.name AS client_name
            FROM `{$invoicesTable}` i
            LEFT JOIN `{$clientsTable}` c ON i.client_id = c.id
            $where ORDER BY i.created_at DESC
        ";
        $stmt = $conn->prepare($query);
        // No bind_param needed for 1=1
        $stmt->execute();
        $result = $stmt->get_result();
        $invoices = [];
        while ($row = $result->fetch_assoc()) { $invoices[] = $row; }
        $stmt->close();
        echo json_encode([
            'status' => 'success', 
            'data' => $invoices,
            'debug' => [
                'user_id' => $user_id,
                'prefix' => $t_prefix,
                'count' => count($invoices),
                'query' => str_replace(["\n", "  "], " ", $query)
            ]
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['status' => 'error', 'message' => 'Invalid data']); exit; }

        $action = $data['action'] ?? 'create';

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

            // Auto-generate token if missing (for legacy invoices)
            if (empty($invoice['public_token'])) {
                $token = bin2hex(random_bytes(32));
                $stmtU = $conn->prepare("UPDATE `{$invoicesTable}` SET public_token = ? WHERE id = ?");
                $stmtU->bind_param("si", $token, $id);
                $stmtU->execute(); $stmtU->close();
                $invoice['public_token'] = $token;
            }

            $stmt2 = $conn->prepare("SELECT id, description, quantity, unit_price, tax_method, tax_profile_id FROM `{$itemsTable}` WHERE invoice_id = ?");
            $stmt2->bind_param("i", $id);
            $stmt2->execute();
            $result2 = $stmt2->get_result();
            $items = [];
            while ($row = $result2->fetch_assoc()) { $items[] = $row; }
            $stmt2->close();

            $invoice['items'] = $items;

            // Fetch Milestones
            $milestonesTable = t('milestones');
            $stmt3 = $conn->prepare("SELECT * FROM `{$milestonesTable}` WHERE invoice_id = ? ORDER BY id ASC");
            $stmt3->bind_param("i", $id);
            $stmt3->execute();
            $result3 = $stmt3->get_result();
            $milestones = [];
            while ($row = $result3->fetch_assoc()) { $milestones[] = $row; }
            $stmt3->close();
            $invoice['milestones'] = $milestones;

            echo json_encode(['status' => 'success', 'data' => $invoice]);
            exit;
        }

        // ── UPDATE STATUS ─────────────────────────────────────────────────────────
        if ($action === 'update_status') {
            $id = (int)($data['id'] ?? 0);
            $status = $data['status'] ?? '';
            $validStatuses = ['Draft','Sent','Paid','Overdue','Accepted','Declined'];
            if (!in_array($status, $validStatuses)) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid status']); exit;
            }
            
            $pay_method = $data['payment_method'] ?? null;
            $pay_date = $data['payment_date'] ?? null;

            $stmt = $conn->prepare("UPDATE `{$invoicesTable}` SET status=?, payment_method=?, payment_date=? WHERE id=? AND user_id=?");
            $stmt->bind_param("sssii", $status, $pay_method, $pay_date, $id, $user_id);
            $stmt->execute(); $stmt->close();
            echo json_encode(['status' => 'success', 'message' => 'Status updated']);
            exit;
        }

        // ── INVOICE A SPECIFIC MILESTONE ──────────────────────────────────────────
        if ($action === 'invoice_milestone') {
            $milestone_id = (int)($data['milestone_id'] ?? 0);
            $conn->begin_transaction();
            try {
                $milestonesTable = t('milestones');
                // 1. Get milestone data
                $stmt = $conn->prepare("SELECT m.*, i.client_id, i.template, i.currency_code, i.notes FROM `{$milestonesTable}` m JOIN `{$invoicesTable}` i ON m.invoice_id = i.id WHERE m.id=? AND i.user_id=?");
                $stmt->bind_param("ii", $milestone_id, $user_id);
                $stmt->execute();
                $m = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$m) throw new Exception("Milestone not found");
                if ($m['status'] === 'Invoiced') throw new Exception("Milestone already invoiced");

                // 2. Create new invoice
                $newNumber = 'INV-M-' . date('Ymd') . '-' . $milestone_id;
                $newToken = bin2hex(random_bytes(32));
                
                $si = $conn->prepare("
                    INSERT INTO `{$invoicesTable}` 
                    (user_id, client_id, invoice_number, status, template, issue_date, due_date, subtotal, tax_total, grand_total, notes, type, public_token, parent_invoice_id)
                    VALUES (?, ?, ?, 'Draft', ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), ?, 0, ?, ?, 'Invoice', ?, ?)
                ");
                $notes = "Milestone Invoice: " . $m['description'] . "\n\n" . ($m['notes'] ?? '');
                $si->bind_param("iisssddssi", 
                    $user_id, $m['client_id'], $newNumber, $m['template'], 
                    $m['amount'], $m['amount'], $notes, $newToken, $m['invoice_id']
                );
                $si->execute();
                $newInvoiceId = $conn->insert_id;
                $si->close();

                // 3. Add single item for this milestone
                $sit = $conn->prepare("INSERT INTO `{$itemsTable}` (invoice_id, description, quantity, unit_price) VALUES (?, ?, 1, ?)");
                $sit->bind_param("isd", $newInvoiceId, $m['description'], $m['amount']);
                $sit->execute();
                $sit->close();

                // 4. Mark milestone as Invoiced
                $upd = $conn->prepare("UPDATE `{$milestonesTable}` SET status='Invoiced', generated_invoice_id=? WHERE id=?");
                $upd->bind_param("ii", $newInvoiceId, $milestone_id);
                $upd->execute();
                $upd->close();

                $conn->commit();
                echo json_encode(['status' => 'success', 'message' => 'Milestone Invoiced', 'invoice_id' => $newInvoiceId]);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
            exit;
        }

        // ── CONVERT QUOTATION TO INVOICE ──────────────────────────────────────────
        if ($action === 'convert_to_invoice') {
            $id = (int)($data['id'] ?? 0);
            $conn->begin_transaction();
            try {
                // 1. Get quotation data
                $stmt = $conn->prepare("SELECT * FROM `{$invoicesTable}` WHERE id=? AND user_id=? AND type='Quotation'");
                $stmt->bind_param("ii", $id, $user_id);
                $stmt->execute();
                $quote = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$quote) throw new Exception("Quotation not found");

                // 2. Generate new invoice number
                $newNumber = 'INV-' . date('Y') . '-' . str_pad($id, 4, '0', STR_PAD_LEFT);
                $newToken = bin2hex(random_bytes(32));

                // 3. Create new invoice
                $si = $conn->prepare("
                    INSERT INTO `{$invoicesTable}` 
                    (user_id, client_id, invoice_number, status, template, issue_date, due_date, subtotal, tax_total, grand_total, notes, type, public_token, parent_invoice_id)
                    VALUES (?, ?, ?, 'Draft', ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), ?, ?, ?, ?, 'Invoice', ?, ?)
                ");
                $si->bind_param("iisssdddssi", 
                    $user_id, $quote['client_id'], $newNumber, $quote['template'], 
                    $quote['subtotal'], $quote['tax_total'], $quote['grand_total'], $quote['notes'], $newToken, $id
                );
                $si->execute();
                $newInvoiceId = $conn->insert_id;
                $si->close();

                // 4. Copy items
                $sit = $conn->prepare("
                    INSERT INTO `{$itemsTable}` (invoice_id, description, quantity, unit_price, tax_method, tax_profile_id)
                    SELECT ?, description, quantity, unit_price, tax_method, tax_profile_id
                    FROM `{$itemsTable}` WHERE invoice_id = ?
                ");
                $sit->bind_param("ii", $newInvoiceId, $id);
                $sit->execute();
                $sit->close();

                // 5. Mark quotation as Accepted
                $upd = $conn->prepare("UPDATE `{$invoicesTable}` SET status='Accepted' WHERE id=?");
                $upd->bind_param("i", $id);
                $upd->execute();
                $upd->close();

                $conn->commit();
                echo json_encode(['status' => 'success', 'message' => 'Converted to Invoice', 'invoice_id' => $newInvoiceId]);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
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
                    UPDATE `{$invoicesTable}` SET invoice_number=?, status=?, template=?, issue_date=?, due_date=?,
                        subtotal=?, tax_total=?, grand_total=?, notes=?,
                        is_recurring=?, recurrence_period=?, next_generation_date=?, recurrence_status=?, auto_send=?,
                        public_token = ?, type = ?, client_notes = ?
                    WHERE id=? AND user_id=?
                ");
                $template = $data['template'] ?? 'minimal';
                $is_rec = !empty($data['is_recurring']) ? 1 : 0;
                $rec_per = $data['recurrence_period'] ?? 'none';
                $next_gen = !empty($data['next_generation_date']) ? $data['next_generation_date'] : null;
                $rec_stat = $data['recurrence_status'] ?? 'active';
                $auto_send = !empty($data['auto_send']) ? 1 : 0;
                $doc_type = $data['type'] ?? 'Invoice';
                $client_notes = $data['client_notes'] ?? null;
                
                // Get current token or generate new
                $st = $conn->prepare("SELECT public_token FROM `{$invoicesTable}` WHERE id = ?");
                $st->bind_param("i", $id); $st->execute();
                $rt = $st->get_result()->fetch_assoc(); $st->close();
                $token = !empty($rt['public_token']) ? $rt['public_token'] : bin2hex(random_bytes(32));
    
                $stmt->bind_param("sssssdddsisssisssii",
                    $data['invoice_number'], $data['status'], $template,
                    $data['issue_date'], $data['due_date'],
                    $data['subtotal'], $data['tax_total'], $data['grand_total'], $data['notes'],
                    $is_rec, $rec_per, $next_gen, $rec_stat, $auto_send,
                    $token, $doc_type, $client_notes, $id, $user_id
                );
                $stmt->execute(); $stmt->close();
    
                // Re-fetch the final token to ensure absolute accuracy in the response
                $st2 = $conn->prepare("SELECT public_token FROM `{$invoicesTable}` WHERE id = ?");
                $st2->bind_param("i", $id); $st2->execute();
                $rt2 = $st2->get_result()->fetch_assoc(); $st2->close();
                $finalToken = $rt2['public_token'] ?? $token;
    
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

                // Replace Milestones
                $milestonesTable = t('milestones');
                $delM = $conn->prepare("DELETE FROM `{$milestonesTable}` WHERE invoice_id=?");
                $delM->bind_param("i", $id); $delM->execute(); $delM->close();
                if (!empty($data['milestones'])) {
                    $siM = $conn->prepare("INSERT INTO `{$milestonesTable}` (invoice_id, description, percentage, amount, status) VALUES (?,?,?,?,?)");
                    foreach ($data['milestones'] as $m) {
                        $desc = $m['description']; $perc = (float)$m['percentage'];
                        $amt = (float)$m['amount']; $stat = $m['status'] ?? 'Pending';
                        $siM->bind_param("isdds", $id, $desc, $perc, $amt, $stat);
                        $siM->execute();
                    }
                    $siM->close();
                }

                $conn->commit();
                echo json_encode(['status' => 'success', 'message' => 'Invoice updated', 'public_token' => $finalToken]);
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
                INSERT INTO `{$invoicesTable}` (user_id, client_id, invoice_number, status, template, issue_date, due_date, subtotal, tax_total, grand_total, notes, is_recurring, recurrence_period, next_generation_date, recurrence_status, auto_send, public_token, type, client_notes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $status = $data['status'] ?? 'Draft';
            $template = $data['template'] ?? 'minimal';
            $is_rec = !empty($data['is_recurring']) ? 1 : 0;
            $rec_per = $data['recurrence_period'] ?? 'none';
            $next_gen = !empty($data['next_generation_date']) ? $data['next_generation_date'] : null;
            $rec_stat = $data['recurrence_status'] ?? 'active';
            $auto_send = !empty($data['auto_send']) ? 1 : 0;
            $token = bin2hex(random_bytes(32));
            $doc_type = $data['type'] ?? 'Invoice';
            $client_notes = $data['client_notes'] ?? null;

            $si->bind_param("iisssssdddsisssisss",
                $user_id, $client_id, $data['invoice_number'], $status, $template,
                $data['issue_date'], $data['due_date'],
                $data['subtotal'], $data['tax_total'], $data['grand_total'], $data['notes'],
                $is_rec, $rec_per, $next_gen, $rec_stat, $auto_send, $token,
                $doc_type, $client_notes
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

            // Save Milestones
            if (!empty($data['milestones'])) {
                $milestonesTable = t('milestones');
                $siM = $conn->prepare("INSERT INTO `{$milestonesTable}` (invoice_id, description, percentage, amount, status) VALUES (?,?,?,?,?)");
                foreach ($data['milestones'] as $m) {
                    $desc = $m['description']; $perc = (float)$m['percentage'];
                    $amt = (float)$m['amount']; $stat = $m['status'] ?? 'Pending';
                    $siM->bind_param("isdds", $invoice_id, $desc, $perc, $amt, $stat);
                    $siM->execute();
                }
                $siM->close();
            }

            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Document saved', 'invoice_id' => $invoice_id, 'public_token' => $token]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}

// Only execute the handler if this file is accessed directly
if (basename($_SERVER['PHP_SELF']) == 'invoices.php') {
    $authUser = authenticate();
    $user_id = $authUser['user_id'];
    $company = requireCompany($user_id);
    $company_id = $company['id'];
    handleInvoicesRequest($conn, $user_id, $company_id);
}

function processRecurringInvoices($conn, $user_id) {
    $invoicesTable = t('invoices');
    $itemsTable = t('invoice_items');

    // Find due recurring invoices
    $stmt = $conn->prepare("
        SELECT * FROM `{$invoicesTable}` 
        WHERE user_id = ? AND is_recurring = 1 AND recurrence_status = 'active' 
        AND next_generation_date IS NOT NULL AND next_generation_date <= CURRENT_DATE
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($template = $result->fetch_assoc()) {
        $conn->begin_transaction();
        try {
            // 1. Generate new invoice number
            $newNumber = $template['invoice_number'] . '-' . date('dmY');
            
            // 2. Create new invoice
            $si = $conn->prepare("
                INSERT INTO `{$invoicesTable}` (user_id, client_id, invoice_number, status, template, issue_date, due_date, subtotal, tax_total, grand_total, notes, public_token)
                SELECT user_id, client_id, ?, ?, template, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), subtotal, tax_total, grand_total, notes, ?
                FROM `{$invoicesTable}` WHERE id = ?
            ");
            $newStatus = $template['auto_send'] ? 'Sent' : 'Draft';
            $newToken = bin2hex(random_bytes(32));
            $si->bind_param("sssi", $newNumber, $newStatus, $newToken, $template['id']);
            $si->execute();
            $newInvoiceId = $conn->insert_id;
            $si->close();

            // 3. Copy items
            $sit = $conn->prepare("
                INSERT INTO `{$itemsTable}` (invoice_id, description, quantity, unit_price, tax_method, tax_profile_id)
                SELECT ?, description, quantity, unit_price, tax_method, tax_profile_id
                FROM `{$itemsTable}` WHERE invoice_id = ?
            ");
            $sit->bind_param("ii", $newInvoiceId, $template['id']);
            $sit->execute();
            $sit->close();

            // 4. Update template's next_generation_date
            $nextDate = new DateTime($template['next_generation_date']);
            if ($template['recurrence_period'] === 'weekly') $nextDate->modify('+1 week');
            elseif ($template['recurrence_period'] === 'bi-weekly') $nextDate->modify('+2 weeks');
            elseif ($template['recurrence_period'] === 'monthly') $nextDate->modify('+1 month');
            elseif ($template['recurrence_period'] === 'yearly') $nextDate->modify('+1 year');
            
            $nextDateStr = $nextDate->format('Y-m-d');
            $upd = $conn->prepare("UPDATE `{$invoicesTable}` SET next_generation_date = ?, last_generated_date = CURRENT_DATE WHERE id = ?");
            $upd->bind_param("si", $nextDateStr, $template['id']);
            $upd->execute();
            $upd->close();

            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
        }
    }
    $stmt->close();
}
?>
