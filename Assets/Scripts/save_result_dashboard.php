<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

$json = file_get_contents("php://input");

if (!$json) {
    echo json_encode(
        ["success" => false, "message" => "沒有收到 Unity 傳來的 JSON"],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

$data = json_decode($json, true);

if (!is_array($data)) {
    echo json_encode(
        ["success" => false, "message" => "JSON 解析失敗"],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}


// ============================================================
// 固定雷達圖評分公式
// 即使 Unity / LLM 沒有附 radar，也會由這裡補算。
// LLM 不參與分數決策。
// ============================================================

function normalizeQuestionId($questionId) {
    $questionId = strtoupper(trim((string)$questionId));
    $questionId = preg_replace('/^Q/', '', $questionId);

    if (ctype_digit($questionId)) {
        return 'Q' . intval($questionId);
    }

    return strtoupper(trim((string)$questionId));
}

function normalizeAnswer($answer) {
    return strtoupper(trim((string)$answer));
}

$correctByQuestion = [
    "Q1" => 0,
    "Q2" => 0,
    "Q3" => 0,
    "Q4" => 1,
    "Q5" => 1,
    "Q6" => 0,
    "Q7" => 0,
    "Q8" => 0,
    "Q9" => 0,
    "Q10" => 0
];

if (isset($data["items"]) && is_array($data["items"])) {
    foreach ($data["items"] as &$item) {
        if (!isset($item["questionId"])) {
            continue;
        }

        $qid = normalizeQuestionId($item["questionId"]);

        if (!array_key_exists($qid, $correctByQuestion)) {
            continue;
        }

        $userAnswer = normalizeAnswer($item["userAnswer"] ?? "");
        $correctAnswer = normalizeAnswer($item["correctAnswer"] ?? "");

        $isCorrect =
            $userAnswer !== "" &&
            $correctAnswer !== "" &&
            $userAnswer === $correctAnswer;

        $correctByQuestion[$qid] = $isCorrect ? 1 : 0;

        // 單題 10 分固定化，避免使用 LLM 自由給分。
        $item["score"] = $isCorrect ? 10 : 0;
    }
    unset($item);
}


// 依正式雷達圖權重計算。
$radar = [
    "身分與門禁管理" =>
        $correctByQuestion["Q1"] * 60 +
        $correctByQuestion["Q2"] * 40,

    "設備與媒體防護" =>
        $correctByQuestion["Q3"] * 60 +
        $correctByQuestion["Q4"] * 40,

    "文件與敏感資訊保護" =>
        $correctByQuestion["Q5"] * 30 +
        $correctByQuestion["Q7"] * 30 +
        $correctByQuestion["Q10"] * 40,

    "環境風險防護" =>
        $correctByQuestion["Q6"] * 50 +
        $correctByQuestion["Q9"] * 50,

    "機房與資產管理" =>
        $correctByQuestion["Q8"] * 70 +
        $correctByQuestion["Q9"] * 30
];


// 若 Unity 已經傳來 radar，而且格式完整，優先採用 Unity 的固定公式結果。
// 否則使用 PHP 根據 items 補算出的結果。
if (
    isset($data["radar"]) &&
    is_array($data["radar"])
) {
    $expectedKeys = [
        "身分與門禁管理",
        "設備與媒體防護",
        "文件與敏感資訊保護",
        "環境風險防護",
        "機房與資產管理"
    ];

    $isCompleteRadar = true;

    foreach ($expectedKeys as $key) {
        if (!array_key_exists($key, $data["radar"])) {
            $isCompleteRadar = false;
            break;
        }
    }

    if ($isCompleteRadar) {
        $radar = [
            "身分與門禁管理" => intval($data["radar"]["身分與門禁管理"]),
            "設備與媒體防護" => intval($data["radar"]["設備與媒體防護"]),
            "文件與敏感資訊保護" => intval($data["radar"]["文件與敏感資訊保護"]),
            "環境風險防護" => intval($data["radar"]["環境風險防護"]),
            "機房與資產管理" => intval($data["radar"]["機房與資產管理"])
        ];
    }
}

$data["radar"] = $radar;

$data["radarScores"] = [
    $radar["身分與門禁管理"],
    $radar["設備與媒體防護"],
    $radar["文件與敏感資訊保護"],
    $radar["環境風險防護"],
    $radar["機房與資產管理"]
];

// 雷達圖總分 = 五個指標平均。
$data["totalScore"] = intval(round(
    array_sum($data["radarScores"]) / 5
));


// ============================================================
// 儲存給 dashboard_result.html 使用
// ============================================================

$resultFile = __DIR__ . "/latest_score_result.json";

$writeResult = file_put_contents(
    $resultFile,
    json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    )
);

if ($writeResult === false) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "無法寫入 latest_score_result.json，請檢查資料夾權限。"
    ], JSON_UNESCAPED_UNICODE);

    exit;
}


$scheme =
    (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
        ? "https"
        : "http";

$base =
    $scheme . "://" .
    $_SERVER["HTTP_HOST"] .
    rtrim(dirname($_SERVER["SCRIPT_NAME"]), "/\\");

$resultUrl = $base . "/dashboard_result.html";


echo json_encode([
    "success" => true,
    "message" => "成績已儲存，雷達圖資料已同步更新。",
    "totalScore" => $data["totalScore"],
    "radar" => $data["radar"],
    "radarScores" => $data["radarScores"],
    "resultUrl" => $resultUrl,
    "imageUrl" => $resultUrl,
    "dashboardImageUrl" => $resultUrl,
    "radarImageUrl" => $resultUrl . "#radar"
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>