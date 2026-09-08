using UnityEngine;

public class UnityAnswerApiButtonTest : MonoBehaviour
{
    [Header("測試哪一個支線")]
    [SerializeField]
    private AuditQuestionKey questionKey =
        AuditQuestionKey.UsbDrive;


    // =========================================
    // 測試 O
    // =========================================
    [ContextMenu("測試送出 O")]
    public void TestO()
    {
        SendAnswer("O");
    }


    // =========================================
    // 測試 X
    // =========================================
    [ContextMenu("測試送出 X")]
    public void TestX()
    {
        SendAnswer("X");
    }


    // =========================================
    // 測試完成 C
    // 文件、通行證使用
    // =========================================
    [ContextMenu("測試送出 C")]
    public void TestComplete()
    {
        SendAnswer("C");
    }


    // =========================================
    // 共用送出
    // =========================================
    private void SendAnswer(string option)
    {
        if (UnityAnswerApi.Instance == null)
        {
            Debug.LogError("❌ 找不到 UnityAnswerApi.Instance");
            return;
        }


        Debug.Log(
            $"🧪 準備測試：{questionKey} / {option}"
        );


        UnityAnswerApi.Instance.SendAnswer(
            questionKey,
            option,
            result =>
            {
                if (result == null)
                {
                    Debug.LogError(
                        "❌ Node.js 沒有回傳有效資料"
                    );

                    return;
                }


                if (!result.success)
                {
                    Debug.LogError(
                        "❌ API 回傳失敗：" +
                        result.message
                    );

                    return;
                }


                if (result.data == null)
                {
                    Debug.LogError(
                        "❌ API 回傳 data 為空"
                    );

                    return;
                }


                Debug.Log(
                    "=============================="
                );

                Debug.Log(
                    $"✅ Question Code：{result.data.questionCode}"
                );

                Debug.Log(
                    $"Question ID：{result.data.questionId}"
                );

                Debug.Log(
                    $"玩家答案：{result.data.selectedOption}"
                );

                Debug.Log(
                    $"正確答案：{result.data.correctOption}"
                );

                Debug.Log(
                    result.data.isCorrect
                        ? "✅ 作答正確"
                        : "❌ 作答錯誤"
                );

                Debug.Log(
                    $"得分：{result.data.score}"
                );

                Debug.Log(
                    "=============================="
                );
            }
        );
    }
}