using UnityEngine;

public class ShowDefect : MonoBehaviour
{
    private MeshRenderer meshRenderer;

    void Start()
    {
        // 1. 遊戲一開始，先抓好自己身上的 Mesh Renderer 組件
        meshRenderer = GetComponent<MeshRenderer>();
    }

    // 2. 這是專門給手把雷射線呼叫的「現形功能」
    public void RevealDefect()
    {
        if (meshRenderer != null)
        {
            meshRenderer.enabled = true; // 啪！把原本拔掉的打勾強制勾回來！
            Debug.Log("【資安稽核通知】玩家成功揪出一個漏洞！");
        }
    }
}