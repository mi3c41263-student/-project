using System.Collections;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;

public class VRNumericLoginManager : MonoBehaviour
{
    [Header("登入 UI")]
    public GameObject loginCanvas;
    public TMP_Text codeText;
    public TMP_Text statusText;

    [Header("代碼設定")]
    public int maxCodeLength = 8;

    [Tooltip("測試模式。正式接 Web API 時再取消勾選。")]
    public bool useMockLogin = true;

    [Tooltip("測試用正確代碼")]
    public string mockCorrectCode = "123456";

    [Header("Web API，正式版再填")]
    [Tooltip("例如：https://你的網站/api/vr_verify_code.php")]
    public string verifyCodeApiUrl = "";

    [Header("登入成功後啟動遊戲流程")]
    public AuditStageFlowManager flowManager;

    public static int CurrentUserId { get; private set; } = -1;
    public static string CurrentUserName { get; private set; } = "";

    private string currentCode = "";
    private bool isSubmitting = false;

    private void Start()
    {
        if (loginCanvas != null)
        {
            loginCanvas.SetActive(true);
        }

        RefreshCodeText();

        if (statusText != null)
        {
            statusText.text = "請輸入 Web 端顯示的登入代碼";
        }
    }

    public void PressKey(string key)
    {
        if (isSubmitting)
        {
            return;
        }

        if (string.IsNullOrEmpty(key))
        {
            return;
        }

        if (currentCode.Length >= maxCodeLength)
        {
            if (statusText != null)
            {
                statusText.text = $"代碼最多 {maxCodeLength} 碼";
            }

            return;
        }

        currentCode += key;
        RefreshCodeText();

        if (statusText != null)
        {
            statusText.text = "";
        }
    }

    public void Backspace()
    {
        if (isSubmitting)
        {
            return;
        }

        if (currentCode.Length <= 0)
        {
            return;
        }

        currentCode = currentCode.Substring(0, currentCode.Length - 1);
        RefreshCodeText();

        if (statusText != null)
        {
            statusText.text = "";
        }
    }

    public void ClearCode()
    {
        if (isSubmitting)
        {
            return;
        }

        currentCode = "";
        RefreshCodeText();

        if (statusText != null)
        {
            statusText.text = "已清除，請重新輸入";
        }
    }

    public void SubmitCode()
    {
        if (isSubmitting)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(currentCode))
        {
            if (statusText != null)
            {
                statusText.text = "請先輸入代碼";
            }

            return;
        }

        if (useMockLogin)
        {
            StartCoroutine(MockLoginRoutine());
        }
        else
        {
            StartCoroutine(WebLoginRoutine());
        }
    }

    private IEnumerator MockLoginRoutine()
    {
        isSubmitting = true;

        if (statusText != null)
        {
            statusText.text = "驗證中...";
        }

        yield return new WaitForSeconds(0.5f);

        if (currentCode == mockCorrectCode)
        {
            CurrentUserId = 1;
            CurrentUserName = "測試使用者";

            if (statusText != null)
            {
                statusText.text = "登入成功";
            }

            yield return new WaitForSeconds(0.5f);
            LoginSuccess();
        }
        else
        {
            isSubmitting = false;

            if (statusText != null)
            {
                statusText.text = "代碼錯誤，請重新輸入";
            }
        }
    }

    private IEnumerator WebLoginRoutine()
    {
        if (string.IsNullOrEmpty(verifyCodeApiUrl))
        {
            isSubmitting = false;

            if (statusText != null)
            {
                statusText.text = "尚未設定 Web API 位址";
            }

            yield break;
        }

        isSubmitting = true;

        if (statusText != null)
        {
            statusText.text = "驗證中...";
        }

        VerifyCodeRequest requestBody = new VerifyCodeRequest
        {
            code = currentCode
        };

        string json = JsonUtility.ToJson(requestBody);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest request = new UnityWebRequest(verifyCodeApiUrl, "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                isSubmitting = false;

                if (statusText != null)
                {
                    statusText.text = "連線失敗，請確認網路或 API";
                }

                Debug.LogWarning($"VR 登入 API 連線失敗：{request.error}", this);
                yield break;
            }

            string responseText = request.downloadHandler.text;
            VerifyCodeResponse response = null;

            try
            {
                response = JsonUtility.FromJson<VerifyCodeResponse>(responseText);
            }
            catch
            {
                isSubmitting = false;

                if (statusText != null)
                {
                    statusText.text = "伺服器回傳格式錯誤";
                }

                Debug.LogWarning($"VR 登入 API 回傳格式錯誤：{responseText}", this);
                yield break;
            }

            if (response == null || !response.success)
            {
                isSubmitting = false;

                if (statusText != null)
                {
                    statusText.text = response != null && !string.IsNullOrEmpty(response.message)
                        ? response.message
                        : "代碼錯誤或已過期";
                }

                Debug.LogWarning($"VR 登入失敗：{responseText}", this);
                yield break;
            }

            CurrentUserId = response.user_id;
            CurrentUserName = response.user_name;

            if (statusText != null)
            {
                statusText.text = $"登入成功，歡迎 {CurrentUserName}";
            }

            yield return new WaitForSeconds(0.5f);
            LoginSuccess();
        }
    }

    private void LoginSuccess()
    {
        if (loginCanvas != null)
        {
            loginCanvas.SetActive(false);
        }

        if (flowManager != null)
        {
            flowManager.StartGameAfterLogin();
        }
        else
        {
            Debug.LogWarning("登入成功，但尚未指定 AuditStageFlowManager，無法開始遊戲。", this);
        }
    }

    private void RefreshCodeText()
    {
        if (codeText != null)
        {
            codeText.text = string.IsNullOrEmpty(currentCode) ? "------" : currentCode;
        }
    }

    [System.Serializable]
    private class VerifyCodeRequest
    {
        public string code;
    }

    [System.Serializable]
    private class VerifyCodeResponse
    {
        public bool success;
        public string message;
        public int user_id;
        public string user_name;
    }
}