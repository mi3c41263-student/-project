SELECT
    ua.id,
    q.question_code,
    ua.selected_option
FROM user_answers ua
INNER JOIN questions q
    ON ua.question_id = q.id
WHERE ua.user_id = 64
ORDER BY ua.id;