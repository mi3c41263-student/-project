using UnityEngine;

public class LaptopUIController : MonoBehaviour
{
    [Header("請把剛剛做的 Canvas 拖拉到這裡")]
    public GameObject screenCanvas;

    void Start()
    {
        // 遊戲一開始時，先將筆電螢幕關閉（隱藏 Canvas）
        if (screenCanvas != null)
        {
            screenCanvas.SetActive(false);
        }
    }

    // 這個功能會在玩家「抓起」筆電時被呼叫
    public void TurnOnScreen()
    {
        if (screenCanvas != null)
        {
            screenCanvas.SetActive(true);
        }
    }

    // 這個功能會在玩家「放下」筆電時被呼叫
    public void TurnOffScreen()
    {
        if (screenCanvas != null)
        {
            screenCanvas.SetActive(false);
        }
    }
}