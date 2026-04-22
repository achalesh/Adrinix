<?php
// api/users.php
require_once 'db.php';

$authUser = authenticate();
$user_id = $authUser['user_id'];
$company = requireCompany($user_id); // Initialize tenant prefix

// Only allow Owners and Admins to manage users
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $authUser['role'] !== 'Owner' && $authUser['role'] !== 'Admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit();
}

$teamTable = t('team_members');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all team members for this tenant
    $stmt = $conn->prepare("SELECT id, name, email, role, created_at FROM `{$teamTable}` WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $members = [];
    while($row = $result->fetch_assoc()) {
        $members[] = $row;
    }
    
    echo json_encode(['status' => 'success', 'data' => $members]);
}
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'delete') {
        // Delete member
        $member_id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM `{$teamTable}` WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $member_id, $user_id);
        
        if($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Team member deleted']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete member']);
        }
    } else {
        // Insert or Update Member
        $name = $data['name'];
        $email = $data['email'];
        $role = $data['role'] ?? 'Viewer';
        
        if (isset($data['id'])) {
            // Update
            $stmt = $conn->prepare("UPDATE `{$teamTable}` SET name = ?, email = ?, role = ? WHERE id = ? AND user_id = ?");
            $stmt->bind_param("sssii", $name, $email, $role, $data['id'], $user_id);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Member updated']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update member']);
            }
        } else {
            // Insert
            $password = password_hash($data['password'] ?? 'default123', PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO `{$teamTable}` (user_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("issss", $user_id, $name, $email, $password, $role);
            
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Team member added']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Email already exists or invalid data']);
            }
        }
    }
}
?>
