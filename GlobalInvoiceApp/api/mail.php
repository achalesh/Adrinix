<?php
// api/mail.php
require_once 'db.php';

// Auth Check
$authUser = authenticate();
$user_id = $authUser['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['to']) || empty($data['subject']) || empty($data['body']) || empty($data['pdf_base64'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    exit;
}

$to = $data['to'];
$subject = $data['subject'];
$message_body = $data['body'];
$pdf_base64 = $data['pdf_base64'];
$filename = !empty($data['filename']) ? $data['filename'] : 'invoice.pdf';

// Get sender info from settings (stored in users table)
$stmt = $conn->prepare("SELECT company_name, contact_email as company_email FROM users WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$settings = $stmt->get_result()->fetch_assoc();
$stmt->close();

$from_name = $settings['company_name'] ?? 'Adrinix Billing';
$from_email = $settings['company_email'] ?? 'noreply@adrinix.syscura.co.uk';

// Prepare PDF content
$pdf_content = base64_decode($pdf_base64);
$encoded_content = chunk_split(base64_encode($pdf_content));

// Generate a unique boundary
$boundary = md5(time());

// Headers
$headers = "From: $from_name <$from_email>\r\n";
$headers .= "Reply-To: $from_email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

// Message body (text/plain)
$body = "--$boundary\r\n";
$body .= "Content-Type: text/plain; charset=\"UTF-8\"\r\n";
$body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body .= $message_body . "\r\n";

// Attachment (application/pdf)
$body .= "--$boundary\r\n";
$body .= "Content-Type: application/pdf; name=\"$filename\"\r\n";
$body .= "Content-Transfer-Encoding: base64\r\n";
$body .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
$body .= $encoded_content . "\r\n";
$body .= "--$boundary--";

// Send email
if (mail($to, $subject, $body, $headers)) {
    echo json_encode(['status' => 'success', 'message' => 'Email sent successfully']);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to send email. Server mail() failed.']);
}
?>
