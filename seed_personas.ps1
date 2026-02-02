# ==========================================================
# Script d'exécution de la Seeding SQL (Personas)
# ==========================================================

$SQL_FILE = "scripts/init-personas-data.sql"
$CONTAINER_NAME = "pmp-postgres"

Write-Host "🚀 Initialisation des Personas dans la base de données..." -ForegroundColor Cyan

# Copier le fichier dans le container
docker cp $SQL_FILE "${CONTAINER_NAME}:/tmp/init-personas.sql"

# Exécuter psql
docker exec -i $CONTAINER_NAME psql -U pmp_user -d pmp_db -f /tmp/init-personas.sql

Write-Host "`n✅ Seeding terminé avec succès !" -ForegroundColor Green
Write-Host "Les 4 personas (Client, Marchand, Étudiant, Formateur) sont prêts." -ForegroundColor White
