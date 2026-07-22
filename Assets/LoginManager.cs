using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;

public class LoginManager : MonoBehaviour
{
    [Header("輸入欄位")]
    [SerializeField] private TMP_InputField accountInput;
    [SerializeField] private TMP_InputField passwordInput;

    [Header("狀態文字")]
    [SerializeField] private TMP_Text statusText;

    [Header("主流程控制器")]
    [SerializeField] private AuditStageFlowManager flowManager;

    [Header("是否先使用假登入")]
    [SerializeField] private bool useFakeLogin = true;

    [Header("Web 登入 API")]
    [SerializeField] private string loginApiUrl = "http://localhost/login.php";

    public void Login()
    {
        if (useFakeLogin)
        {
            FakeLogin();
            return;
        }

        StartCoroutine(LoginToWeb());
    }

    private void FakeLogin()
    {
        if (statusText != null)
        {
            statusText.text = "登入成功，正在進入 VR 稽核場景...";
        }

        PlayerPrefs.SetString("playerName", accountInput != null ? accountInput.text : "Tester");
        PlayerPrefs.Save();

        if (flowManager != null)
        {
            flowManager.StartGameAfterLogin();
        }
    }

    private IEnumerator LoginToWeb()
    {
        string account = accountInput != null ? accountInput.text : "";
        string password = passwordInput != null ? passwordInput.text : "";

        if (string.IsNullOrWhiteSpace(account) || string.IsNullOrWhiteSpace(password))
        {
            if (statusText != null)
            {
                statusText.text = "請輸入帳號與密碼";
            }

            yield break;
        }

        WWWForm form = new WWWForm();
        form.AddField("account", account);
        form.AddField("password", password);

        using UnityWebRequest request = UnityWebRequest.Post(loginApiUrl, form);

        if (statusText != null)
        {
            statusText.text = "登入中...";
        }

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            if (statusText != null)
            {
                statusText.text = "登入失敗：" + request.error;
            }

            yield break;
        }

        string response = request.downloadHandler.text;

        // 先用簡單判斷，之後可依你的 Web 回傳 JSON 再改。
        if (response.Contains("success") || response.Contains("ok") || response.Contains("true"))
        {
            if (statusText != null)
            {
                statusText.text = "登入成功，正在進入 VR 稽核場景...";
            }

            PlayerPrefs.SetString("playerName", account);
            PlayerPrefs.Save();

            if (flowManager != null)
            {
                flowManager.StartGameAfterLogin();
            }
        }
        else
        {
            if (statusText != null)
            {
                statusText.text = "帳號或密碼錯誤";
            }
        }
    }
}