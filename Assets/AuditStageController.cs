using UnityEngine;
using TMPro; // 如果對話框是用 TextMeshPro 顯示文字

public class AuditStageController : MonoBehaviour
{
    [Header("--- 劇情對話 UI 組件 ---")]
    public GameObject dialogueCanvas;     // Blender 對話框本體
    public TextMeshProUGUI dialogueText;  // 對話框內的文字組件

    [Header("--- 支線控制物件 ---")]
    public GameObject auditTargetsGroup;  // 放滿缺失文件的資料夾物件 (_AuditTargets)
    public GameObject missionHintUI;     // 左上角的任務提示框

    [Header("--- 劇本內容設定 ---")]
    // 在 Inspector 裡可以直接填入多行劇本
    [TextArea(2, 4)]
    public string[] storyLines = new string[]
    {
        "資安主管：『早安。雖然年度稽核是例行作業，不過我們還是照流程來。你範圍都確認好了嗎？』",
        "稽核員：『確認好了。今天主要會看 Clause 6人員控制與 Clause 7實體控制。』",
        "資安主管：『了解。重大違規會影響績效。相關紀錄你可以參考年度管理審查報告。』"
    };

    private int currentLineIndex = 0; // 目前播到第幾句
    private bool isStoryFinished = false; // 劇情是否跑完

    void Start()
    {
        // 1. 開局防呆：確保支線物件此時是關閉的，玩家不能偷跑
        if (auditTargetsGroup != null) auditTargetsGroup.SetActive(false);
        if (missionHintUI != null) missionHintUI.SetActive(false);

        // 2. 顯示第一句台詞
        UpdateDialogue();
    }

    void Update()
    {
        // 如果劇情已經結束，就不再偵測切換對話的按鍵
        if (isStoryFinished) return;

        // 偵測玩家按下右手 Trigger 鍵（這裡先用鍵盤 Space 空白鍵或 VR 的 PrimaryButton 測試）
        // 如果你已經設定好新版 Input System，也可以換成你的 Input Action
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
        {
            NextLine();
        }
    }

    // 顯示下一句對話
    void NextLine()
    {
        currentLineIndex++;

        if (currentLineIndex < storyLines.Length)
        {
            UpdateDialogue();
        }
        else
        {
            EndStoryAndUnlockDiscovery(); // 👉 劇本字完了，啟動解鎖！
        }
    }

    void UpdateDialogue()
    {
        if (dialogueText != null && currentLineIndex < storyLines.Length)
        {
            dialogueText.text = storyLines[currentLineIndex];
        }
    }

    // 🔥 核心神技：關閉劇情、啟動探索
    void EndStoryAndUnlockDiscovery()
    {
        isStoryFinished = true;

        // 1. 隱藏 Blender 對話框
        if (dialogueCanvas != null) dialogueCanvas.SetActive(false);

        // 2. 啪！解鎖桌上所有文件、筆電、識別證的互動能力
        if (auditTargetsGroup != null) auditTargetsGroup.SetActive(true);

        // 3. 亮起左上角的系統提示框，引導任務開始
        if (missionHintUI != null) missionHintUI.SetActive(true);

        Debug.Log("[系統大腦] 劇情結束！正式開啟第一站支線抓漏探索！");
    }
}