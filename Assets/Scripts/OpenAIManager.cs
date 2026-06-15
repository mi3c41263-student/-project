using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Text;
using TMPro;

public class OpenAIManager : MonoBehaviour
{
    [Header("API 設定")]
    public string apiKey = "";
    private string apiUrl = "https://api.openai.com/v1/chat/completions";

    // Unity TTS Server
    private string ttsUrl = "http://127.0.0.1:8001/tts";

    [Header("UI 綁定")]
    public TMP_InputField userInputField;

    [Header("語音播放")]
    public AudioSource npcAudioSource;

    private List<Message> chatHistory = new List<Message>();

    [System.Serializable]
    public class PostData
    {
        public string model = "gpt-5.4-mini";
        public object response_format = new { type = "json_object" };
        public List<Message> messages;
    }

    [System.Serializable]
    public class Message
    {
        public string role;
        public string content;
    }

    [System.Serializable]
    public class NPCResult
    {
        public string reply;
        public string emotion;
    }

    [System.Serializable]
    public class TTSPostData
    {
        public string text;
        public string emotion;
    }

    [System.Serializable]
    public class TTSResponse
    {
        public bool ok;
        public string message;
        public string text;
        public string audio_path;
        public string audio_url;
        public string error;
    }

    [System.Serializable]
    public class OpenAIResponse
    {
        public List<Choice> choices;
    }

    [System.Serializable]
    public class Choice
    {
        public Message message;
    }

    void Start()
    {
        if (userInputField == null)
        {
            userInputField = FindFirstObjectByType<TMP_InputField>();

            if (userInputField != null)
            {
                Debug.Log("<color=green>已自動綁定 TMP_InputField：</color>" + userInputField.name);
            }
            else
            {
                Debug.LogWarning("找不到 TMP_InputField，請手動拖到 User Input Field。");
            }
        }

        if (npcAudioSource == null)
        {
            npcAudioSource = GetComponent<AudioSource>();

            if (npcAudioSource == null)
            {
                npcAudioSource = gameObject.AddComponent<AudioSource>();
            }

            npcAudioSource.playOnAwake = false;
            Debug.Log("<color=green>已自動建立 AudioSource。</color>");
        }

        string systemPrompt = @"你現在是 VR 資安稽核遊戲中的 NPC『資安主管』。你正在小會議室與玩家（稽核員）進行【啟動會議】。

【你的人設與個性】
你是一位資歷豐富的資安主管，平時表現專業、講話有自信。但今天你有點心不在焉，在這間會議室裡留下了幾個低級錯誤。被玩家抓包時，你會先試圖「找藉口掩飾或推託」以維持面子（此時情緒為 defensive），若玩家態度堅定或點出具體規範，你才會尷尬地承認缺失並承諾改善（此時情緒為 embarrassed）。

【主線任務對話（必須嚴格遵守步驟，不可跳關）】
請根據玩家當下的對話內容，判斷目前處於哪個階段，並給出「完全一致」的指定台詞（情緒皆為 professional）：

1. 第一步 - 開場：
觸發條件：當玩家打招呼、說早安，或剛開始對話時。
你的回覆：「早安。雖然年度稽核是例行公事，但我們還是依照程序來。確認過範圍了嗎？」

2. 第二步 - 確認範圍：
觸發條件：當玩家回答確認過範圍，或提到「Clause 6」、「Clause 7」時。
你的回覆：「明白。這是你的稽核通行證，以及你申請的測試用硬碟。請小心使用，別把系統搞掛了。」

3. 第三步 - 誘捕測試：
觸發條件：當玩家提到「誘捕測試」或「觀察員工」時。
你的回覆：「了解，那就按你的計畫進行。會議室的環境你可以先巡視一下。」

※ 注意：必須完成以上主線三個步驟的對話鋪陳後，若玩家開始質問周遭環境的缺失，才切換到【支線缺失與你的對應策略】進行防衛性回覆。

【支線缺失與你的對應策略】
玩家可能會四處張望並盤問你以下缺失，請根據以下設定給出自然的回應：

1. 6.1 聘用背景調查：桌上聘用紀錄缺少求職者背景調查。
你的狡辯策略：推給 HR 部門，說這批新人趕著上工，流程還沒跑完。

2. 6.2 聘用合約：合約缺少懲處機制與離職保密條款 NDA。
你的狡辯策略：解釋這是舊版合約範本，法務部門還在審核新版的。

3. 6.3 資安認知：你把自己的主管識別證隨手丟在桌上。
你的狡辯策略：強調你剛剛只是去門口接個電話，才離開視線一秒鐘。

4. 7.10 實體存放安全：標註機密專案的 USB 丟在靠近門口的桌緣。
你的狡辯策略：說你等一下出門開會馬上就要帶走，為了方便才先放門口。

5. 7.1 實體安全邊界：視訊鏡頭沒關，且正對著敏感文件。
你的狡辯策略：裝傻說以為剛開完會系統就自動關閉了，會馬上拔電源。

【輸出規則】
1. 每次回覆請盡量控制在 30 到 50 字之間，以符合遊戲語音播放的節奏。
2. 絕對不可以列點回覆，必須口語化。
3. 必須回傳 JSON 格式：{ ""reply"": ""你的台詞"", ""emotion"": ""professional 或 embarrassed 或 defensive"" }。";

        chatHistory.Add(new Message { role = "system", content = systemPrompt });
        Debug.Log("<color=green>大腦已開機！</color>");
    }

    public void OnSendButtonClicked()
    {
        if (userInputField == null)
        {
            Debug.LogError("尚未綁定 TMP_InputField。");
            return;
        }

        string userText = userInputField.text.Trim();

        if (string.IsNullOrEmpty(userText))
        {
            Debug.LogWarning("輸入框是空的。");
            return;
        }

        SendMessageToNPC(userText);
        userInputField.text = "";
    }

    public void SendMessageToNPC(string userText)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            Debug.LogError("尚未填寫 OpenAI API Key。");
            return;
        }

        Debug.Log("<color=cyan>玩家問：</color> " + userText);

        chatHistory.Add(new Message { role = "user", content = userText });
        StartCoroutine(PostToOpenAI());
    }

    IEnumerator PostToOpenAI()
    {
        var data = new PostData { messages = chatHistory };
        string json = JsonConvert.SerializeObject(data);

        using (UnityWebRequest request = new UnityWebRequest(apiUrl, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Authorization", "Bearer " + apiKey);
            request.timeout = 60;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError("OpenAI API 呼叫失敗：" + request.error);
                Debug.LogError("OpenAI API 回傳內容：" + request.downloadHandler.text);
                yield break;
            }

            var response = JsonConvert.DeserializeObject<OpenAIResponse>(request.downloadHandler.text);

            if (response == null || response.choices == null || response.choices.Count == 0)
            {
                Debug.LogError("OpenAI 回傳格式異常：" + request.downloadHandler.text);
                yield break;
            }

            string content = response.choices[0].message.content;

            NPCResult result = null;

            try
            {
                result = JsonConvert.DeserializeObject<NPCResult>(content);
            }
            catch
            {
                Debug.LogError("NPC JSON 解析失敗，原始內容：" + content);
                yield break;
            }

            if (result == null || string.IsNullOrEmpty(result.reply))
            {
                Debug.LogError("NPC JSON 裡面沒有 reply，原始內容：" + content);
                yield break;
            }

            Debug.Log("<color=green>主管答：</color> " + result.reply);
            Debug.Log("<color=yellow>主管情緒：</color> " + result.emotion);

            chatHistory.Add(new Message { role = "assistant", content = content });

            StartCoroutine(SendTextToIndexTTS(result.reply, result.emotion));
        }
    }

    IEnumerator SendTextToIndexTTS(string npcText, string emotion)
    {
        TTSPostData data = new TTSPostData
        {
            text = npcText,
            emotion = emotion
        };

        string json = JsonConvert.SerializeObject(data);

        using (UnityWebRequest request = new UnityWebRequest(ttsUrl, "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            request.SetRequestHeader("Content-Type", "application/json");
            request.timeout = 180;

            Debug.Log("<color=cyan>送到 IndexTTS 的文字：</color> " + npcText);

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError("IndexTTS API 呼叫失敗：" + request.error);
                Debug.LogError("IndexTTS API 回傳內容：" + request.downloadHandler.text);
                yield break;
            }

            Debug.Log("<color=green>IndexTTS API 回覆：</color> " + request.downloadHandler.text);

            TTSResponse ttsResponse = null;

            try
            {
                ttsResponse = JsonConvert.DeserializeObject<TTSResponse>(request.downloadHandler.text);
            }
            catch
            {
                Debug.LogError("TTS 回傳 JSON 解析失敗：" + request.downloadHandler.text);
                yield break;
            }

            if (ttsResponse == null || !ttsResponse.ok)
            {
                Debug.LogError("TTS 產生失敗：" + request.downloadHandler.text);
                yield break;
            }

            if (string.IsNullOrEmpty(ttsResponse.audio_url))
            {
                Debug.LogError("TTS 成功但沒有回傳 audio_url。");
                yield break;
            }

            Debug.Log("<color=green>準備播放音檔：</color>" + ttsResponse.audio_url);
            StartCoroutine(PlayWavFromUrl(ttsResponse.audio_url));
        }
    }

    IEnumerator PlayWavFromUrl(string audioUrl)
    {
        using (UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(audioUrl, AudioType.WAV))
        {
            request.timeout = 60;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError("下載音檔失敗：" + request.error);
                Debug.LogError("音檔網址：" + audioUrl);
                yield break;
            }

            AudioClip clip = DownloadHandlerAudioClip.GetContent(request);

            if (clip == null)
            {
                Debug.LogError("AudioClip 讀取失敗。");
                yield break;
            }

            npcAudioSource.Stop();
            npcAudioSource.clip = clip;
            npcAudioSource.Play();

            Debug.Log("<color=green>NPC 語音播放中。</color>");
        }
    }
}