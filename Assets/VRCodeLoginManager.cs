using System;
using System.Collections;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;

public class VRCodeLoginManager : MonoBehaviour
{
    // =========================================
    // Node.js
    // =========================================
    [Header("Node.js VR Login API")]
    [SerializeField]
    private string exchangeUrl =
        "http://192.168.100.147:3000/api/vr/exchange-ticket";


    // =========================================
    // Login UI
    // =========================================
    [Header("登入畫面")]
    [SerializeField]
    private GameObject loginCanvas;

    [SerializeField]
    private TMP_Text codeText;

    [SerializeField]
    private TMP_Text statusText;


    // =========================================
    // Game Flow
    // =========================================
    [Header("正式遊戲流程")]
    [SerializeField]
    private AuditStageFlowManager stageFlowManager;


    // =========================================
    // Code
    // =========================================
    private string currentCode = "";

    private const int CodeLength = 6;

    private bool isLoggingIn = false;

    private bool isLoggedIn = false;


    // =========================================
    // Unity → Node
    // =========================================
    [Serializable]
    private class LoginRequest
    {
        public string ticket;
    }


    // =========================================
    // Node → Unity
    // =========================================
    [Serializable]
    private class LoginResponse
    {
        public bool success;

        public string message;

        public UserData user;

        public int sessionId;
    }


    [Serializable]
    private class UserData
    {
        public int id;

        public string username;

        public string email;
    }


    // =========================================
    // Start
    // =========================================
    private void Start()
    {
        currentCode = "";

        isLoggingIn = false;

        isLoggedIn = false;


        RefreshCodeText();


        SetStatus(
            "請輸入 Web 顯示的 6 碼登入代碼"
        );


        if (loginCanvas != null)
        {
            loginCanvas.SetActive(true);
        }
        else
        {
            Debug.LogError(
                "❌ 尚未設定 Login Canvas"
            );
        }


        Debug.Log(
            "🔐 VR Login Manager 已啟動"
        );
    }


    // =========================================
    // 輸入
    // =========================================
    private void AddCharacter(
        string value)
    {
        if (
            isLoggingIn ||
            isLoggedIn
        )
        {
            return;
        }


        if (
            currentCode.Length >=
            CodeLength
        )
        {
            return;
        }


        currentCode += value;


        RefreshCodeText();
    }


    public void Press0()
    {
        AddCharacter("0");
    }

    public void Press1()
    {
        AddCharacter("1");
    }

    public void Press2()
    {
        AddCharacter("2");
    }

    public void Press3()
    {
        AddCharacter("3");
    }

    public void Press4()
    {
        AddCharacter("4");
    }

    public void Press5()
    {
        AddCharacter("5");
    }

    public void Press6()
    {
        AddCharacter("6");
    }

    public void Press7()
    {
        AddCharacter("7");
    }

    public void Press8()
    {
        AddCharacter("8");
    }

    public void Press9()
    {
        AddCharacter("9");
    }


    public void PressAt()
    {
        AddCharacter("@");
    }


    public void PressHash()
    {
        AddCharacter("#");
    }


    // =========================================
    // Backspace
    // =========================================
    public void Backspace()
    {
        if (
            isLoggingIn ||
            isLoggedIn
        )
        {
            return;
        }


        if (
            currentCode.Length == 0
        )
        {
            return;
        }


        currentCode =
            currentCode.Substring(
                0,
                currentCode.Length - 1
            );


        RefreshCodeText();
    }


    // =========================================
    // Clear
    // =========================================
    public void Clear()
    {
        if (
            isLoggingIn ||
            isLoggedIn
        )
        {
            return;
        }


        currentCode = "";


        RefreshCodeText();
    }


    // =========================================
    // Confirm
    // =========================================
    public void ConfirmCode()
    {
        if (
            isLoggedIn ||
            isLoggingIn
        )
        {
            return;
        }


        if (
            currentCode.Length !=
            CodeLength
        )
        {
            SetStatus(
                "請輸入完整 6 碼代碼"
            );

            return;
        }


        foreach (char c in currentCode)
        {
            bool valid =
                char.IsDigit(c) ||
                c == '@' ||
                c == '#';


            if (!valid)
            {
                SetStatus(
                    "登入代碼格式錯誤"
                );

                return;
            }
        }


        isLoggingIn = true;


        SetStatus(
            "正在驗證登入代碼..."
        );


        StartCoroutine(
            ExchangeTicket()
        );
    }


    // =========================================
    // Exchange ticket
    // =========================================
    private IEnumerator ExchangeTicket()
    {
        LoginRequest requestData =
            new LoginRequest
            {
                ticket = currentCode
            };


        string json =
            JsonUtility.ToJson(
                requestData
            );


        Debug.Log(
            "📤 Unity → Node.js VR Login"
        );

        Debug.Log(
            json
        );


        byte[] bodyRaw =
            Encoding.UTF8.GetBytes(
                json
            );


        using (
            UnityWebRequest request =
                new UnityWebRequest(
                    exchangeUrl,
                    UnityWebRequest.kHttpVerbPOST
                )
        )
        {
            request.uploadHandler =
                new UploadHandlerRaw(
                    bodyRaw
                );


            request.downloadHandler =
                new DownloadHandlerBuffer();


            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );


            request.timeout = 10;


            yield return
                request.SendWebRequest();


            // =====================================
            // HTTP error
            // =====================================
            if (
                request.result !=
                UnityWebRequest.Result.Success
            )
            {
                isLoggingIn = false;


                Debug.LogError(
                    "❌ VR 登入失敗"
                );

                Debug.LogError(
                    "HTTP：" +
                    request.responseCode
                );

                Debug.LogError(
                    request.downloadHandler.text
                );


                SetStatus(
                    "登入失敗：代碼錯誤、已使用或已過期"
                );


                yield break;
            }


            // =====================================
            // Response
            // =====================================
            string responseText =
                request.downloadHandler.text;


            Debug.Log(
                "📥 Node.js → Unity"
            );

            Debug.Log(
                responseText
            );


            LoginResponse result;


            try
            {
                result =
                    JsonUtility
                        .FromJson<LoginResponse>(
                            responseText
                        );
            }
            catch (Exception error)
            {
                isLoggingIn = false;


                Debug.LogError(
                    "❌ 登入 JSON 解析失敗：" +
                    error.Message
                );


                SetStatus(
                    "登入資料格式錯誤"
                );


                yield break;
            }


            // =====================================
            // Validate
            // =====================================
            if (
                result == null ||
                !result.success ||
                result.user == null
            )
            {
                isLoggingIn = false;


                SetStatus(
                    result != null
                        ? result.message
                        : "登入失敗"
                );


                yield break;
            }


            if (
                result.user.id <= 0 ||
                result.sessionId <= 0
            )
            {
                isLoggingIn = false;


                Debug.LogError(
                    "❌ 後端沒有回傳有效 User ID / Session ID"
                );


                SetStatus(
                    "登入資料不完整"
                );


                yield break;
            }


            // =====================================
            // UnityAnswerApi
            // =====================================
            if (
                UnityAnswerApi.Instance ==
                null
            )
            {
                isLoggingIn = false;


                Debug.LogError(
                    "❌ 找不到 UnityAnswerApi"
                );


                SetStatus(
                    "UnityAnswerApi 尚未啟動"
                );


                yield break;
            }


            // =====================================
            // Save current user/session
            // =====================================
            UnityAnswerApi.Instance
                .SetUserId(
                    result.user.id
                );


            UnityAnswerApi.Instance
                .SetSessionId(
                    result.sessionId
                );


            isLoggedIn = true;

            isLoggingIn = false;


            Debug.Log(
                "===================================="
            );

            Debug.Log(
                "✅ VR 登入成功"
            );

            Debug.Log(
                $"User ID：{result.user.id}"
            );

            Debug.Log(
                $"Username：{result.user.username}"
            );

            Debug.Log(
                $"Session ID：{result.sessionId}"
            );

            Debug.Log(
                "===================================="
            );


            SetStatus(
                $"登入成功：{result.user.username}"
            );


            // =====================================
            // 正式開始遊戲
            // =====================================
            if (
                stageFlowManager != null
            )
            {
                stageFlowManager
                    .StartGameAfterLogin();
            }
            else
            {
                Debug.LogError(
                    "❌ 尚未設定 AuditStageFlowManager"
                );
            }


            // =====================================
            // Close login UI
            // =====================================
            if (
                loginCanvas != null
            )
            {
                loginCanvas.SetActive(
                    false
                );
            }
        }
    }


    // =========================================
    // UI
    // =========================================
    private void RefreshCodeText()
    {
        if (
            codeText == null
        )
        {
            return;
        }


        codeText.text =
            currentCode.PadRight(
                CodeLength,
                '_'
            );
    }


    private void SetStatus(
        string message)
    {
        if (
            statusText != null
        )
        {
            statusText.text =
                message;
        }
    }
}