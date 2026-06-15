using UnityEngine;
using UnityEngine.UI;

public class VRAntiClip : MonoBehaviour
{
    [Header("設定")]
    public Transform headCamera;    // 拖入你的 Main Camera
    public float clipDistance = 0.15f; // 偵測距離
    public LayerMask wallLayer;     // 哪些圖層會觸發黑畫面

    private RawImage blackoutImage;

    void Start()
    {
        // 自動生成一個遮住眼睛的 UI 畫布
        GameObject canvasObj = new GameObject("AntiClipCanvas");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 999; // 確保在最前面

        GameObject imgObj = new GameObject("BlackoutImage");
        imgObj.transform.SetParent(canvasObj.transform);
        blackoutImage = imgObj.AddComponent<RawImage>();
        blackoutImage.color = new Color(0, 0, 0, 0); // 初始透明
        blackoutImage.rectTransform.anchorMin = Vector2.zero;
        blackoutImage.rectTransform.anchorMax = Vector2.one;
    }

    void Update()
    {
        if (headCamera == null) return;

        // 從頭盔往前射出一條射線
        Ray ray = new Ray(headCamera.position, headCamera.forward);
        bool isTooClose = Physics.Raycast(ray, clipDistance, wallLayer);

        // 如果太靠近牆壁，瞬間變黑；否則透明
        blackoutImage.color = isTooClose ? Color.black : new Color(0, 0, 0, 0);
    }
}
