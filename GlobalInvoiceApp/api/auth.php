<?php
// api/auth.php
require_once 'db.php';

// $secret_key is loaded from environment in db.php — single source of truth

function createJWT($payload, $secret) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function issueRefreshToken($conn, $user_id, $member_id = null) {
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + (86400 * 30)); // 30 days
    
    $stmt = $conn->prepare("INSERT INTO refresh_tokens (user_id, member_id, token, expires_at) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiss", $user_id, $member_id, $token, $expires);
    $stmt->execute();
    $stmt->close();
    
    return $token;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'login') {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        // 1. Check main owners table
        $stmt = $conn->prepare("SELECT id, password_hash, company_name FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($user = $res->fetch_assoc()) {
            if (password_verify($password, $user['password_hash'])) {
                // Owner Authentication Success
                $access_token = createJWT(['user_id' => $user['id'], 'role' => 'Owner', 'exp' => time() + 3600], $secret_key);
                $refresh_token = issueRefreshToken($conn, $user['id']);
                
                echo json_encode(['status' => 'success', 'token' => $access_token, 'refreshToken' => $refresh_token, 'user' => [
                    'id' => $user['id'], 'name' => $user['company_name'] ?: 'Owner', 'role' => 'Owner'
                ]]);
                exit;
            }
        }
        $stmt->close();

        // 2. Check global team_members table
        $stmt = $conn->prepare("SELECT id, user_id, company_id, password_hash, name, role FROM team_members WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($member = $res->fetch_assoc()) {
            if (password_verify($password, $member['password_hash'])) {
                // Member Authentication Success (Inherit parent user_id and specific company_id)
                $access_token = createJWT([
                    'user_id' => $member['user_id'], 
                    'member_id' => $member['id'], 
                    'company_id' => $member['company_id'], 
                    'role' => $member['role'], 
                    'exp' => time() + 3600
                ], $secret_key);
                
                $refresh_token = issueRefreshToken($conn, $member['user_id'], $member['id']);

                echo json_encode(['status' => 'success', 'token' => $access_token, 'refreshToken' => $refresh_token, 'user' => [
                    'id' => $member['id'], 
                    'name' => $member['name'], 
                    'role' => $member['role'],
                    'company_id' => $member['company_id']
                ]]);
                exit;
            }
        }
        $stmt->close();

        echo json_encode(['status' => 'error', 'message' => 'Invalid email or password']);
        exit;
    }

    if ($action === 'register') {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $company = $data['company'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'Email and Password required']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("INSERT INTO users (email, password_hash, company_name) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $email, $hash, $company);
        
        if ($stmt->execute()) {
            // Auto Login
            $user_id = $conn->insert_id;
            
            // Create Default Company for new user
            $c_stmt = $conn->prepare("INSERT INTO companies (user_id, name) VALUES (?, ?)");
            $c_stmt->bind_param("is", $user_id, $company);
            $c_stmt->execute();
            $company_id = $conn->insert_id;
            $c_stmt->close();

            // Provision Tenant Tables immediately
            ensureTenantSchema($conn, $company_id);

            $access_token = createJWT(['user_id' => $user_id, 'role' => 'Owner', 'exp' => time() + 3600], $secret_key);
            $refresh_token = issueRefreshToken($conn, $user_id);
            
            echo json_encode(['status' => 'success', 'token' => $access_token, 'refreshToken' => $refresh_token, 'user' => [
                'id' => $user_id, 'name' => $company, 'role' => 'Owner'
            ]]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Email already registered']);
        }
        $stmt->close();
        exit;
    }

    if ($action === 'forgot_password') {
        $email = $data['email'] ?? '';
        if (!$email) {
            echo json_encode(['status' => 'error', 'message' => 'Email required']);
            exit;
        }

        // Check if user exists
        $exists = false;
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->fetch_assoc()) $exists = true;
        $stmt->close();

        if (!$exists) {
            $stmt = $conn->prepare("SELECT id FROM team_members WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) $exists = true;
            $stmt->close();
        }

        if ($exists) {
            // Generate token
            $token = bin2hex(random_bytes(32));
            
            // Delete old tokens for clean state
            $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
            $del->bind_param("s", $email);
            $del->execute();
            
            // Insert new token
            $ins = $conn->prepare("INSERT INTO password_resets (email, token) VALUES (?, ?)");
            $ins->bind_param("ss", $email, $token);
            $ins->execute();

            // Send Email
            $appUrl = getenv('APP_URL') ?: 'https://adrinix.syscura.co.uk';
            $resetLink = $appUrl . "/login?token=" . $token;
            $subject = "Password Reset Request - Adrinix";
            $message = "You requested a password reset.\n\nClick here to reset it:\n" . $resetLink . "\n\nIf you didn't request this, ignore this email.";
            $headers = "From: noreply@adrinix.com";
            
            mail($email, $subject, $message, $headers);
            
            echo json_encode(['status' => 'success', 'message' => 'Recovery link sent! Check your email.']);
        } else {
            // Standard security practice: Don't reveal if email existed or not
            echo json_encode(['status' => 'success', 'message' => 'Recovery link sent! Check your email.']);
        }
        exit;
    }

    if ($action === 'reset_password') {
        $token = $data['token'] ?? '';
        $newPassword = $data['password'] ?? '';

        if (!$token || strlen($newPassword) < 6) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid data or password too short']);
            exit;
        }

        // Validate token (must be under 1 hour old)
        $stmt = $conn->prepare("SELECT email FROM password_resets WHERE token = ? AND created_at >= NOW() - INTERVAL 1 HOUR");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $res = $stmt->get_result();
        
        if ($row = $res->fetch_assoc()) {
            $email = $row['email'];
            $hash = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Update users table
            $upd1 = $conn->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
            $upd1->bind_param("ss", $hash, $email);
            $upd1->execute();
            
            // Update team_members table
            $upd2 = $conn->prepare("UPDATE team_members SET password_hash = ? WHERE email = ?");
            $upd2->bind_param("ss", $hash, $email);
            $upd2->execute();
            
            // Consume token
            $del = $conn->prepare("DELETE FROM password_resets WHERE token = ?");
            $del->bind_param("s", $token);
            $del->execute();

            echo json_encode(['status' => 'success', 'message' => 'Password reset successfully!']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token']);
        }
        exit;
    }

    if ($action === 'refresh') {
        $refreshToken = $data['refreshToken'] ?? '';
        if (!$refreshToken) {
            echo json_encode(['status' => 'error', 'message' => 'Refresh token required']);
            exit;
        }

        $stmt = $conn->prepare("SELECT user_id, member_id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()");
        $stmt->bind_param("s", $refreshToken);
        $stmt->execute();
        $res = $stmt->get_result();
        
        if ($row = $res->fetch_assoc()) {
            // Issue new access token
            $payload = [
                'user_id' => $row['user_id'],
                'role' => $row['member_id'] ? 'Member' : 'Owner', // Basic role detection
                'exp' => time() + 3600
            ];
            if ($row['member_id']) $payload['member_id'] = $row['member_id'];
            
            $access_token = createJWT($payload, $secret_key);
            echo json_encode(['status' => 'success', 'token' => $access_token]);
        } else {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Invalid or expired refresh token']);
        }
        $stmt->close();
        exit;
    }
}
?>
