using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class LearningRecordTest : MonoBehaviour
{
    [Header("Node.js API")]
    [SerializeField]
    private string apiUrl =
        "http://192.168.100.147:3000/api/unity/answers";

    [Header("測試資料")]
    [SerializeField] private int userId = 1;
    [SerializeField] private int questionId = 1;
    [SerializeField] private string selectedOption = "O";

    [System.Serializable]
    private class AnswerRequest
    {
        public int userId;
        public int questionId;
        public string selectedOption;
    }

    private void Start()
    {
        StartCoroutine(SendTestAnswer());
    }

    private IEnumerator SendTestAnswer()
    {
        AnswerRequest answer = new AnswerRequest
        {
            userId = userId,
            questionId = questionId,
            selectedOption = selectedOption
        };

        string json = JsonUtility.ToJson(answer);

        Debug.Log("準備送出 Unity 作答：" + json);

        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest request =
               new UnityWebRequest(
                   apiUrl,
                   UnityWebRequest.kHttpVerbPOST))
        {
            request.uploadHandler =
                new UploadHandlerRaw(bodyRaw);

            request.downloadHandler =
                new DownloadHandlerBuffer();

            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            request.timeout = 10;

            yield return request.SendWebRequest();

            if (request.result ==
                UnityWebRequest.Result.Success)
            {
                Debug.Log("【成功】Unity 作答已送到 Node.js");

                Debug.Log(
                    "後端回傳：" +
                    request.downloadHandler.text
                );
            }
            else
            {
                Debug.LogError(
                    "【失敗】Unity 作答傳送失敗\n" +
                    "HTTP：" + request.responseCode + "\n" +
                    "錯誤：" + request.error + "\n" +
                    "後端回傳：" +
                    request.downloadHandler.text
                );
            }
        }
    }
}