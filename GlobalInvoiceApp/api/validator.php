<?php
// api/validator.php

class Validator {
    private $errors = [];
    private $data = [];

    public function __construct($data) {
        $this->data = $data;
    }

    public function validate($rules) {
        foreach ($rules as $field => $fieldRules) {
            $value = $this->data[$field] ?? null;
            $ruleList = explode('|', $fieldRules);

            foreach ($ruleList as $rule) {
                $this->applyRule($field, $value, $rule);
            }
        }
        return empty($this->errors);
    }

    private function applyRule($field, $value, $rule) {
        $params = [];
        if (strpos($rule, ':') !== false) {
            [$rule, $paramStr] = explode(':', $rule);
            $params = explode(',', $paramStr);
        }

        switch ($rule) {
            case 'required':
                if ($value === null || $value === '' || (is_array($value) && empty($value))) {
                    $this->addError($field, "The $field field is required.");
                }
                break;
            case 'email':
                if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($field, "The $field must be a valid email address.");
                }
                break;
            case 'numeric':
                if ($value !== null && !is_numeric($value)) {
                    $this->addError($field, "The $field must be a number.");
                }
                break;
            case 'min':
                if ($value !== null && $value < $params[0]) {
                    $this->addError($field, "The $field must be at least {$params[0]}.");
                }
                break;
            case 'date':
                if ($value && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    $this->addError($field, "The $field must be a valid date (YYYY-MM-DD).");
                }
                break;
            case 'in':
                if ($value && !in_array($value, $params)) {
                    $this->addError($field, "The $field is invalid.");
                }
                break;
        }
    }

    private function addError($field, $message) {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = $message;
        }
    }

    public function getErrors() {
        return $this->errors;
    }
}

/**
 * Global helper to validate and return errors if fails
 */
function validateRequest($data, $rules) {
    $validator = new Validator($data);
    if (!$validator->validate($rules)) {
        http_response_code(422);
        echo json_encode([
            'status' => 'error',
            'message' => 'Validation failed',
            'errors' => $validator->getErrors()
        ]);
        exit;
    }
    return true;
}
?>
