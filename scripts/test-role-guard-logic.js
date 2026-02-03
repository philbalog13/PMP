// Mock types
const UserRole = {
    CLIENT: 'ROLE_CLIENT',
    MARCHAND: 'ROLE_MARCHAND',
    ETUDIANT: 'ROLE_ETUDIANT',
    FORMATEUR: 'ROLE_FORMATEUR'
};

const Permission = {
    ACCESS_LAB: 'ACCESS_LAB'
};

// Mock roleUtils
function normalizeRole(role) {
    if (!role) return role;
    const r = String(role).trim().toUpperCase();
    if (r === 'STUDENT' || r === 'ETUDIANT' || r === 'ROLE_ETUDIANT') return UserRole.ETUDIANT;
    if (r === 'TRAINER' || r === 'FORMATEUR' || r === 'ROLE_FORMATEUR') return UserRole.FORMATEUR;
    if (r === 'CLIENT' || r === 'ROLE_CLIENT') return UserRole.CLIENT;
    if (r === 'MERCHANT' || r === 'MARCHAND' || r === 'ROLE_MARCHAND') return UserRole.MARCHAND;
    return role;
}

function hasRole(userRole, allowedRoles) {
    const normalized = normalizeRole(userRole);
    console.log(`[Mock] hasRole: userRole=${userRole}, normalized=${normalized}, allowed=${JSON.stringify(allowedRoles)}`);
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(normalized);
}

// Mock Test
const userPayload = {
    role: 'ROLE_ETUDIANT'
};

const routeConfig = {
    path: '/student',
    allowedRoles: [UserRole.ETUDIANT, UserRole.CLIENT]
};

console.log('--- Testing Logic ---');
const normalized = normalizeRole(userPayload.role);
console.log('Normalized Role:', normalized);
console.log('Is valid:', hasRole(userPayload.role, routeConfig.allowedRoles));

if (hasRole(userPayload.role, routeConfig.allowedRoles)) {
    console.log('SUCCESS: Access should be granted.');
} else {
    console.log('FAILURE: Access denied.');
}
