using UnityEngine;

public class AutoAddColliders : MonoBehaviour
{
    void Awake()
    {
        // 自動抓取肚子裡所有帶有 MeshFilter (網格) 的子物件
        MeshFilter[] filters = GetComponentsInChildren<MeshFilter>();

        foreach (MeshFilter filter in filters)
        {
            // 如果子物件身上還沒有碰撞器，就強行塞一個 Mesh Collider 給它！
            if (filter.GetComponent<Collider>() == null)
            {
                MeshCollider mc = filter.gameObject.AddComponent<MeshCollider>();
                // 確保它是精準的物理牆壁
                mc.convex = false; 
            }
        }
        Debug.Log($"[資安場景修復] 報告麗安：已成功為 {filters.Length} 個辦公室子物件披上硬殼防護！");
    }
}