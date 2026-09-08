using System;
using System.Collections;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.Networking;

public class VRCodeLoginManager : MonoBehaviour
{
    // =========================================
    // Node.js API
    // =========================================
    [Header("Node.js API")]
    [SerializeField]
    private string exchangeUrl =
        "http://192.168.100.147:3000/api/vr/exchange-ticket";


    // =========================================
    // 登入 UI
    // =========================================
    [Header("登入畫面")]
    [SerializeField]
    private TMP_Text codeText;

    [SerializeField]
    private TMP_Text statusText;

    [Tooltip("拖入真正包含 LoginPanel、KeyboardPanel 的 login_canvas")]
    [SerializeField]
    private GameObject loginCanvas;


    // =========================================
    // 正式遊戲流程
    //
    // 不再關閉 GameObject
    // 不再 Disable / Enable Script
    //
    // 登入成功後直接呼叫：
    // StartGameAfterLogin()
    // =========================================
    [Header("正式遊戲流程")]
    [SerializeField]
    private AuditStageFlowManager stageFlowManager;


    // =========================================
    // 額外登入成功事件
    // =========================================
    [Header("登入成功後事件")]
    [SerializeField]
    private UnityEvent onLoginSuccess;


    // =========================================
    // 玩家目前輸入代碼
    // =========================================
    private string currentCode = "";

    private const int CodeLength = 6;


    // 正在登入
    private bool isLoggingIn = false;

    // 已完成登入
    private bool isLoggedIn = false;


    // =========================================
    // Unity → Node.js
    // =========================================
    [Serializable]
    private class LoginRequest
    {
        public string ticket;
    }


    // =========================================
    // Node.js → Unity
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
            "請輸入 Web 顯示的 6 碼代碼"
        );


        // =====================================
        // 登入畫面保持開啟
        // =====================================
        if (loginCanvas != null)
        {
            loginCanvas.SetActive(true);
        }
        else
        {
            Debug.LogError(
                "❌ VRCodeLoginManager 沒有設定 loginCanvas"
            );
        }


        // =====================================
        // 注意：
        //
        // 這裡完全不碰 AuditStageFlowManager.enabled
        // 也完全不碰 _GameFlowManager.SetActive()
        //
        // AuditStageFlowManager 必須從遊戲一開始
        // 就正常執行自己的 Start()
        // =====================================


        Debug.Log(
            "===================================="
        );

        Debug.Log(
            "🔐 VR 登入模式啟動"
        );

        Debug.Log(
            "等待玩家輸入 Web 產生的登入代碼"
        );

        Debug.Log(
            "===================================="
        );
    }


    // =========================================
    // 加入字元
    // =========================================
    private void AddCharacter(
        string value)
    {
        if (isLoggingIn)
        {
            return;
        }


        if (isLoggedIn)
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


    // =========================================
    // 數字
    // =========================================
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


    // =========================================
    // @
    // =========================================
    public void PressAt()
    {
        AddCharacter("@");
    }


    // =========================================
    // #
    // =========================================
    public void PressHash()
    {
        AddCharacter("#");
    }


    // =========================================
    // 回退
    // =========================================
    public void Backspace()
    {
        if (isLoggingIn)
        {
            return;
        }


        if (isLoggedIn)
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
    // 清除
    // =========================================
    public void Clear()
    {
        if (isLoggingIn)
        {
            return;
        }


        if (isLoggedIn)
        {
            return;
        }


        currentCode = "";


        RefreshCodeText();
    }


    // =========================================
    // 確認登入
    // =========================================
    public void ConfirmCode()
    {
        Debug.Log(
            "🔥 ConfirmCode() 有被按到"
        );

        Debug.Log(
            "目前 currentCode = [" +
            currentCode +
            "]"
        );

        Debug.Log(
            "目前長度 = " +
            currentCode.Length
        );


        // 已成功登入
        if (isLoggedIn)
        {
            Debug.Log(
                "ℹ️ 已完成 VR 登入，不重複送 Ticket"
            );

            return;
        }


        // API 還在處理
        if (isLoggingIn)
        {
            Debug.Log(
                "ℹ️ 正在驗證登入代碼"
            );

            return;
        }


        // 必須六碼
        if (
            currentCode.Length !=
            CodeLength
        )
        {
            SetStatus(
                "請輸入完整 6 碼代碼"
            );


            Debug.LogWarning(
                "❌ VRCodeLoginManager 收到的代碼不是 6 碼"
            );


            return;
        }


        // =====================================
        // 字元格式
        // =====================================
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


                Debug.LogWarning(
                    "❌ 登入代碼有非法字元：" +
                    c
                );


                return;
            }
        }


        // =====================================
        // 開始登入
        // =====================================
        isLoggingIn = true;


        SetStatus(
            "正在驗證登入代碼..."
        );


        Debug.Log(
            "✅ 6 碼檢查完成，準備送 API"
        );


        StartCoroutine(
            ExchangeTicket()
        );
    }


    // =========================================
    // Unity → Node.js
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
            "===================================="
        );

        Debug.Log(
            "📤 Unity → Node.js VR 登入"
        );

        Debug.Log(
            json
        );

        Debug.Log(
            "===================================="
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
            // HTTP 失敗
            // =====================================
            if (
                request.result !=
                UnityWebRequest.Result.Success
            )
            {
                isLoggingIn = false;


                string errorText =
                    request.downloadHandler != null
                        ? request.downloadHandler.text
                        : "";


                Debug.LogError(
                    "===================================="
                );

                Debug.LogError(
                    "❌ VR 登入失敗"
                );

                Debug.LogError(
                    "HTTP：" +
                    request.responseCode
                );

                Debug.LogError(
                    errorText
                );

                Debug.LogError(
                    "===================================="
                );


                try
                {
                    LoginResponse errorResult =
                        JsonUtility
                            .FromJson<LoginResponse>(
                                errorText
                            );


                    if (
                        errorResult != null &&
                        !string.IsNullOrWhiteSpace(
                            errorResult.message
                        )
                    )
                    {
                        SetStatus(
                            errorResult.message
                        );
                    }
                    else
                    {
                        SetStatus(
                            "登入失敗：代碼錯誤或已過期"
                        );
                    }
                }
                catch
                {
                    SetStatus(
                        "登入失敗：無法連接登入服務"
                    );
                }


                yield break;
            }


            // =====================================
            // Node.js 回傳
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
                    "❌ VR 登入 JSON 解析失敗：" +
                    error.Message
                );


                SetStatus(
                    "登入資料格式錯誤"
                );


                yield break;
            }


            // =====================================
            // API 資料不正確
            // =====================================
            if (
                result == null ||
                !result.success ||
                result.user == null
            )
            {
                isLoggingIn = false;


                SetStatus(
                    result != null &&
                    !string.IsNullOrWhiteSpace(
                        result.message
                    )
                        ? result.message
                        : "登入失敗"
                );


                yield break;
            }


            // =====================================
            // User / Session 防呆
            // =====================================
            if (
                result.user.id <= 0 ||
                result.sessionId <= 0
            )
            {
                isLoggingIn = false;


                Debug.LogError(
                    "❌ Node.js 沒有回傳有效的 User ID 或 Session ID"
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
                    "❌ 找不到 UnityAnswerApi.Instance"
                );


                SetStatus(
                    "UnityAnswerApi 尚未啟動"
                );


                yield break;
            }


            // =====================================
            // 儲存 User ID
            // =====================================
            UnityAnswerApi.Instance
                .SetUserId(
                    result.user.id
                );


            // =====================================
            // 儲存 Session ID
            // =====================================
            UnityAnswerApi.Instance
                .SetSessionId(
                    result.sessionId
                );


            // =====================================
            // 標記登入成功
            // =====================================
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
            // ★ 關鍵修改
            //
            // 不 Enable AuditStageFlowManager
            // 不 SetActive GameFlowManager
            //
            // 直接呼叫它原本設計好的
            // StartGameAfterLogin()
            // =====================================
            if (stageFlowManager != null)
            {
                Debug.Log(
                    "▶ 呼叫 AuditStageFlowManager.StartGameAfterLogin()"
                );


                stageFlowManager
                    .StartGameAfterLogin();
            }
            else
            {
                Debug.LogError(
                    "❌ 尚未設定 Stage Flow Manager"
                );
            }


            // =====================================
            // 額外事件
            // =====================================
            onLoginSuccess?.Invoke();


            // =====================================
            // 再保險關閉一次登入 Canvas
            // =====================================
            if (loginCanvas != null)
            {
                loginCanvas.SetActive(false);


                Debug.Log(
                    "✅ VRCodeLoginManager 已關閉登入 Canvas：" +
                    loginCanvas.name
                );
            }
        }
    }


    // =========================================
    // 更新 CodeText
    // =========================================
    private void RefreshCodeText()
    {
        if (codeText == null)
        {
            return;
        }


        codeText.text =
            currentCode.PadRight(
                CodeLength,
                '_'
            );
    }


    // =========================================
    // 更新提示文字
    // =========================================
    private void SetStatus(
        string message)
    {
        if (statusText != null)
        {
            statusText.text =
                message;
        }
    }
}