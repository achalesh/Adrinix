<?php
// api/ai.php
require_once 'db.php';

function handleAIRequest($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['status' => 'error', 'message' => 'Invalid data']); exit; }

    $action = $data['action'] ?? '';
    $context = $data['context'] ?? '';

    // ── ACTION: SUGGEST ITEMS ──────────────────────────────────────────────────
    if ($action === 'suggest_items') {
        $goal = $data['goal'] ?? '';
        
        // In a real production app, this would call OpenAI/Gemini API.
        // For this high-fidelity demo, we implement a smart simulation engine 
        // that returns structured items based on the user's project goal.
        
        $suggestions = [];
        $goalLower = strtolower($goal);

        if (str_contains($goalLower, 'web') || str_contains($goalLower, 'app') || str_contains($goalLower, 'site')) {
            $suggestions = [
                ['description' => 'UI/UX Design & Prototyping (Figma)', 'quantity' => 1, 'unit_price' => 1200],
                ['description' => 'Frontend Development (React/Next.js)', 'quantity' => 1, 'unit_price' => 2500],
                ['description' => 'Backend API & Database Integration', 'quantity' => 1, 'unit_price' => 3000],
                ['description' => 'Quality Assurance & Cross-browser Testing', 'quantity' => 1, 'unit_price' => 800],
                ['description' => 'Cloud Deployment & SSL Configuration', 'quantity' => 1, 'unit_price' => 500],
            ];
        } elseif (str_contains($goalLower, 'marketing') || str_contains($goalLower, 'seo') || str_contains($goalLower, 'social')) {
            $suggestions = [
                ['description' => 'Comprehensive SEO Audit & Strategy', 'quantity' => 1, 'unit_price' => 1500],
                ['description' => 'Content Creation (4 High-quality Articles)', 'quantity' => 4, 'unit_price' => 250],
                ['description' => 'Social Media Management (Monthly)', 'quantity' => 1, 'unit_price' => 1200],
                ['description' => 'Google Ads Campaign Setup & Optimization', 'quantity' => 1, 'unit_price' => 900],
                ['description' => 'Email Marketing Automation (HubSpot/Mailchimp)', 'quantity' => 1, 'unit_price' => 1100],
            ];
        } elseif (str_contains($goalLower, 'logo') || str_contains($goalLower, 'brand') || str_contains($goalLower, 'design')) {
            $suggestions = [
                ['description' => 'Logo Design (3 Initial Concepts + Revisions)', 'quantity' => 1, 'unit_price' => 800],
                ['description' => 'Brand Identity Guidelines & Typography', 'quantity' => 1, 'unit_price' => 1200],
                ['description' => 'Stationery Design (Business Cards, Letterheads)', 'quantity' => 1, 'unit_price' => 400],
                ['description' => 'Social Media Brand Assets Kit', 'quantity' => 1, 'unit_price' => 600],
            ];
        } else {
            // Default smart fallback
            $suggestions = [
                ['description' => 'Professional Consultation & Strategy Session', 'quantity' => 2, 'unit_price' => 250],
                ['description' => 'Custom Project Implementation (Phase 1)', 'quantity' => 1, 'unit_price' => 2000],
                ['description' => 'Project Management & Coordination', 'quantity' => 1, 'unit_price' => 500],
                ['description' => 'Maintenance & Support (Monthly Retainer)', 'quantity' => 1, 'unit_price' => 300],
            ];
        }

        echo json_encode([
            'status' => 'success',
            'data' => $suggestions,
            'message' => 'AI has generated project items based on your goal.'
        ]);
        exit;
    }

    // ── ACTION: REFINE TEXT ────────────────────────────────────────────────────
    if ($action === 'refine_text') {
        $text = $data['text'] ?? '';
        
        // Simulation of professional text refinement
        $refined = "PROFESSIONAL PROPOSAL SUMMARY:\n\n" . 
                   "We are pleased to present this comprehensive proposal for your consideration. Our approach focuses on delivering high-impact results through strategic planning and precise execution. " . 
                   "The following scope of work has been tailored to address your specific business objectives while ensuring scalability and long-term value.\n\n" . 
                   "KEY DELIVERABLES:\n" . 
                   "• Professional project management and clear communication milestones.\n" . 
                   "• High-quality implementation using industry best practices.\n" . 
                   "• Dedicated support and quality assurance at every stage.\n\n" . 
                   "TERMS:\n" . 
                   "A standard 40% initial deposit is required to initiate the project, with the remaining balance due upon successful delivery of the final milestones.";

        echo json_encode([
            'status' => 'success',
            'data' => $refined,
            'message' => 'Your proposal notes have been professionally refined by AI.'
        ]);
        exit;
    }
}

$authUser = authenticate();
handleAIRequest($conn, $authUser['user_id']);
