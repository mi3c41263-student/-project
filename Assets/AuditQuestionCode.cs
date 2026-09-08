public static class AuditQuestionCode
{
    public static string GetCode(AuditQuestionKey key)
    {
        switch (key)
        {
            // =========================
            // 第一站
            // =========================
            case AuditQuestionKey.SupervisorBadge:
                return "S1_BADGE";

            case AuditQuestionKey.ExpiredPass:
                return "S1_EXPIRED_PASS";

            case AuditQuestionKey.UsbDrive:
                return "S1_USB";

            case AuditQuestionKey.ManagementReview:
                return "S1_MANAGEMENT_REVIEW";

            case AuditQuestionKey.EmployeeEvaluation:
                return "S1_EMPLOYEE_EVALUATION";


            // =========================
            // 第二站
            // =========================
            case AuditQuestionKey.Tablet:
                return "S2_TABLET";

            case AuditQuestionKey.VisitorCard:
                return "S2_VISITOR_CARD";

            case AuditQuestionKey.Coffee:
                return "S2_COFFEE";

            case AuditQuestionKey.InternalDocument:
                return "S2_INTERNAL_DOCUMENT";

            case AuditQuestionKey.EmploymentContract:
                return "S2_EMPLOYMENT_CONTRACT";


            // =========================
            // 第三站
            // =========================
            case AuditQuestionKey.PasswordNote:
                return "S3_PASSWORD_NOTE";

            case AuditQuestionKey.Ewaste:
                return "S3_EWASTE";

            case AuditQuestionKey.Cake:
                return "S3_CAKE";

            case AuditQuestionKey.SecurityPoster:
                return "S3_SECURITY_POSTER";

            case AuditQuestionKey.MaintenanceRecord:
                return "S3_MAINTENANCE_RECORD";
        }

        return "";
    }
}