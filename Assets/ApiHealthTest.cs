using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

public class ApiHealthTest : MonoBehaviour
{
    [Header("Node.js 後端健康檢查網址")]
    [SerializeField]
    private string healthUrl =
        "http://192.168.100.147:3000/api/health";

    private void Start()
    {
        StartCoroutine(CheckApiConnection());
    }

    private IEnumerator CheckApiConnection()
    {
        Debug.Log("開始測試 Node.js API：" + healthUrl);

        using (UnityWebRequest request = UnityWebRequest.Get(healthUrl))
        {
            request.timeout = 10;

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("【成功】Unity 已連接 Node.js API");
                Debug.Log("後端回傳：" + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError(
                    "【失敗】Unity 無法連接 Node.js API\n" +
                    "錯誤：" + request.error + "\n" +
                    "HTTP 狀態碼：" + request.responseCode + "\n" +
                    "網址：" + healthUrl
                );
            }
        }
    }
}