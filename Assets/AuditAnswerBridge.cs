using UnityEngine;
using UnityEngine.Events;

public class AuditAnswerBridge : MonoBehaviour
{
    [Header("這個物件對應哪一個正式支線")]
    [SerializeField]
    private AuditQuestionKey questionKey;


    [Header("API 成功後事件")]
    [SerializeField]
    private UnityEvent onRecorded;


    [Header("O/X 題：答對事件")]
    [SerializeField]
    private UnityEvent onCorrect;


    [Header("O/X 題：答錯事件")]
    [SerializeField]
    private UnityEvent onWrong;


    // 文件 / COMPLETE 類型避免重複送 C
    private bool completionAlreadySent = false;


    // =========================================
    // 玩家選 O
    // =========================================
    public void SubmitO()
    {
        SubmitAnswer("O");
    }


    // =========================================
    // 玩家選 X
    // =========================================
    public void SubmitX()
    {
        SubmitAnswer("X");
    }


    // =========================================
    // 文件找到缺失
    // 或失效通行證完成
    // =========================================
    public void SubmitComplete()
    {
        if (completionAlreadySent)
        {
            Debug.Log(
                $"ℹ️ {questionKey} 已經完成，不重複送出 C"
            );

            return;
        }

        SubmitAnswer("C");
    }


    // =========================================
    // 共用 API
    // =========================================
    private void SubmitAnswer(string option)
    {
        if (UnityAnswerApi.Instance == null)
        {
            Debug.LogError(
                $"❌ {questionKey} 找不到 UnityAnswerApi.Instance"
            );

            return;
        }


        Debug.Log(
            $"📤 正式支線送出：{questionKey} / {option}"
        );


        UnityAnswerApi.Instance.SendAnswer(
            questionKey,
            option,
            result =>
            {
                if (result == null)
                {
                    Debug.LogError(
                        $"❌ {questionKey} Node.js 沒有回傳資料"
                    );

                    return;
                }


                if (!result.success)
                {
                    Debug.LogError(
                        $"❌ {questionKey} API 失敗：{result.message}"
                    );

                    return;
                }


                if (result.data == null)
                {
                    Debug.LogError(
                        $"❌ {questionKey} API data 為空"
                    );

                    return;
                }


                // =============================
                // 成功寫進 SQL
                // =============================
                Debug.Log(
                    $"✅ 已寫入 SQL：{result.data.questionCode}"
                );

                Debug.Log(
                    $"玩家答案：{result.data.selectedOption}"
                );

                Debug.Log(
                    $"正確答案：{result.data.correctOption}"
                );

                Debug.Log(
                    $"是否正確：{result.data.isCorrect}"
                );

                Debug.Log(
                    $"得分：{result.data.score}"
                );


                // =============================
                // 完成度
                //
                // 注意：
                // O/X 即使答錯，
                // 仍然代表「已經完成作答」
                // =============================
                if (AuditProgressManager.Instance != null)
{
    Debug.Log(
        $"📊 找到 AuditProgressManager，準備記錄完成度：{questionKey}"
    );

    AuditProgressManager.Instance
        .MarkCompleted(questionKey);
}
else
{
    Debug.LogError(
        "❌ 找不到 AuditProgressManager.Instance，完成度無法增加！"
    );
}


                onRecorded?.Invoke();


                // =============================
                // 正確 / 錯誤提示
                // =============================
                if (result.data.isCorrect)
                {
                    Debug.Log($"✅ {questionKey} 正確");

                    onCorrect?.Invoke();
                }
                else
                {
                    Debug.Log($"❌ {questionKey} 錯誤");

                    onWrong?.Invoke();
                }


                // =============================
                // C 類型成功後鎖定
                //
                // 文件不應重複寫入
                // =============================
                if (
                    option == "C" &&
                    result.data.isCorrect
                )
                {
                    completionAlreadySent = true;
                }
            }
        );
    }
}