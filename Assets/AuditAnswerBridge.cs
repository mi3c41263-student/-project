using UnityEngine;

public class AuditAnswerBridge : MonoBehaviour
{
    [Header("正式資料庫題目")]
    [SerializeField]
    private AuditQuestionKey questionKey;


    // 防止本地完成度重複計數
    private bool localCompleted = false;


    // ================================
    // 玩家選 O
    // ================================
    public void SubmitO()
    {
        SubmitAnswer("O");
    }


    // ================================
    // 玩家選 X
    // ================================
    public void SubmitX()
    {
        SubmitAnswer("X");
    }


    // ================================
    // DOCUMENT / COMPLETE
    // ================================
    public void SubmitComplete()
    {
        SubmitAnswer("C");
    }


    private void SubmitAnswer(
        string answer)
    {
        if (
            UnityAnswerApi.Instance == null
        )
        {
            Debug.LogError(
                "❌ 找不到 UnityAnswerApi"
            );

            return;
        }


        UnityAnswerApi.Instance
            .SendAnswer(
                questionKey,
                answer,
                OnAnswerSaved
            );
    }


    private void OnAnswerSaved(
        UnityAnswerApi.AnswerResponse response)
    {
        if (
            response == null ||
            !response.success
        )
        {
            Debug.LogError(
                "❌ 此支線沒有成功寫入後端"
            );

            return;
        }


        Debug.Log(
            "✅ 支線已正式寫入後端：" +
            AuditQuestionCode.GetCode(
                questionKey
            )
        );


        if (!localCompleted)
        {
            localCompleted = true;


            if (
                AuditProgressManager.Instance !=
                null
            )
            {
                AuditProgressManager.Instance
                    .MarkCompleted(
                        questionKey
                    );
            }
        }
    }
}