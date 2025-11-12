# Ejemplos curl / PowerShell para probar endpoints de Misiones

Sustituye `{{baseUrl}}`, `{{token}}`, `{{analysisId}}` y `{{missionId}}` según tu entorno.

Nota: en PowerShell puedes usar `curl.exe` si la alias de PowerShell apunta a Invoke-WebRequest.

1) Listar misiones del usuario autenticado

curl -X GET "{{baseUrl}}/api/missions/my" -H "Authorization: Bearer {{token}}"

2) Listar misiones de un análisis específico

curl -X GET "{{baseUrl}}/api/missions/analysis/{{analysisId}}" -H "Authorization: Bearer {{token}}"

3) Marcar misión como corregida (sin cuerpo)

curl -X POST "{{baseUrl}}/api/missions/{{missionId}}/mark-fixed" -H "Authorization: Bearer {{token}}"

4) Re-análisis de una misión (subir archivo corregido)

curl -X POST "{{baseUrl}}/api/missions/{{missionId}}/reanalyze" -H "Authorization: Bearer {{token}}" -F "file=@/path/to/corrected_project.zip"

5) Re-análisis del análisis completo (subir archivo corregido)

curl -X POST "{{baseUrl}}/api/analysis/{{analysisId}}/reanalyze" -H "Authorization: Bearer {{token}}" -F "file=@/path/to/corrected_project.zip"

--

Sugerencia rápida para PowerShell (si `curl` está mapeado a Invoke-WebRequest):

# Usar curl.exe explícito
curl.exe -X POST "{{baseUrl}}/api/missions/{{missionId}}/reanalyze" -H "Authorization: Bearer {{token}}" -F "file=@C:\ruta\a\correccion.zip"

Si necesitas, puedo generar una colección de pruebas más completa (tests en Postman), o también crear una migration TypeORM (TS) en lugar del SQL bruto. Dime si prefieres eso y lo creo.
