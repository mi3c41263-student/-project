using UnityEngine;


public class VRSpreadCircle : MonoBehaviour
{
    public GameObject redCirclePrefab;   // 拖入剛剛做好的紅圈 Prefab
    public UnityEngine.XR.Interaction.Toolkit.Interactors.XRRayInteractor rayInteractor; // 拖入手把自帶的 XR Ray Interactor

    void Update()
    {
        // 1. 檢查雷射線有沒有射中東西
        if (rayInteractor.TryGetCurrent3DRaycastHit(out RaycastHit hit))
        {
            // 2. 檢查射中的物件是不是我們的資安文件 (Tag 要設定為 AuditDocument)
            if (hit.collider.CompareTag("AuditDocument"))
            {
                // 3. 檢查玩家有沒有按下手把板機鍵 (此處先用滑鼠左鍵/手把主要鍵示意)
                if (Input.GetKeyDown(KeyCode.JoystickButton0) || Input.GetMouseButtonDown(0))
                {
                    // 在雷射擊中的那個「物理接觸點」生成紅圈圈
                    GameObject newCircle = Instantiate(redCirclePrefab, hit.point, Quaternion.identity);

                    // 🛠️ 關鍵防呆：讓紅圈圈的「正面」完美貼平在紙張表面上
                    newCircle.transform.forward = hit.normal; 

                    // 🛠️ 關鍵防呆：將紅圈圈變成文件的子物件，這樣文件平滑移動時，圈圈才會跟著飛！
                    newCircle.transform.SetParent(hit.collider.transform);

                    // 稍微把圈圈往外推 0.001 公尺，防止 3D 貼面重合閃爍 (Z-Fighting)
                    newCircle.transform.position += hit.normal * 0.001f;
                }
            }
        }
    }
}