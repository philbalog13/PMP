-- Test getStudents query
SELECT
    u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
    COALESCE(
        (SELECT COUNT(*) FROM learning.student_progress sp WHERE sp.student_id = u.id AND sp.status = 'COMPLETED'),
        0
    ) as workshops_completed,
    COALESCE(
        (SELECT SUM(xp_awarded) FROM learning.badges b WHERE b.student_id = u.id),
        0
    ) as total_xp,
    COALESCE(
        (SELECT COUNT(*) FROM learning.badges b WHERE b.student_id = u.id),
        0
    ) as badge_count
FROM users.users u
WHERE u.role = 'ROLE_ETUDIANT'
ORDER BY u.created_at DESC
LIMIT 5;
