# 🚀 Guía de Deployment - Healthy App

**Versión:** 1.0
**Fecha:** Febrero 2025
**Estado:** Ready for QA → Production

---

## 📋 Pre-Deployment Checklist

### 1. Verificaciones de Código

```bash
# En raíz del proyecto
✓ npm run build      # Debe compilar sin errores (8.70s esperado)
✓ npm run lint       # Si existe, sin errores críticos
✓ npm run test       # Si existen tests, deben pasar
```

**Criterios de éxito:**
- ✅ Build sin errores
- ✅ 0 warnings de TypeScript (si aplica)
- ✅ 0 importes sin usar
- ✅ Bundle size reasonable (<1.5MB gzip)

---

### 2. Verificaciones de Base de Datos

```sql
-- Ejecutar en ORDEN en ambiente QA y luego PROD

-- 1. Sprint A fixes
-- Archivo: sql/fix_sprint_a.sql
SELECT COUNT(*) FROM gramajes_componentes_base;  -- Debe existir
-- Verificar columna codigo_unidad en arbol_recetas
-- Verificar menu_componente_id puede ser NULL en solicitudes_cambio_menu

-- 2. Sprint C optimizations
-- Archivo: sql/fix_sprint_c.sql
SELECT COUNT(*) FROM pg_indexes
WHERE tablename IN ('pedidos_servicio', 'ciclos_menu');  -- Deben existir índices

-- 3. Verificar RPCs
SELECT COUNT(*) FROM pg_proc
WHERE proname IN ('calcular_dia_ciclo', 'consolidar_pedidos_servicio',
                   'get_ingredientes_totales', 'descontar_stock_consolidado');
-- Deben existir 4 RPCs
```

---

### 3. Verificaciones de Datos

```sql
-- Verificar datos semilla
SELECT COUNT(*) FROM gramajes_componentes_base;
-- Esperado: 10+ (valores por defecto)

-- Verificar ciclos existentes
SELECT COUNT(*) FROM ciclos_menu;
-- Estos deberían migrar sus servicios si es necesario

-- Verificar operaciones
SELECT COUNT(*) FROM operaciones WHERE activo = true;
-- Todas deben estar configuradas correctamente
```

---

## 🔄 Estrategia de Deployment

### Opción 1: Blue-Green Deployment (Recomendado)

```
TIMING: Fuera de horario de producción (ej: 22:00 - 00:00)

PASO 1: Preparar Ambiente Verde
├─ Clonar base de datos de PROD (backup)
├─ Ejecutar SQL migrations (fix_sprint_a.sql, fix_sprint_c.sql)
├─ Verificar funcionalidad básica
├─ Cargar datos de prueba
└─ Validar todos los cambios

PASO 2: Deploy Aplicación Verde
├─ npm run build
├─ Subir archivos a servidor verde
├─ Reiniciar servicios
├─ Verificar health checks
└─ Correr smoke tests

PASO 3: Validación en Verde
├─ Chef: Crear ciclo y activar
├─ Coordinador: Crear pedido
├─ Supervisor: Consolidar
├─ Verificar stock descontado
└─ ~30 minutos de testing

PASO 4: Switchover
├─ Actualizar load balancer → apunta a verde
├─ Monitorear tráfico
├─ Verificar sin errores
└─ Si hay problemas, volver a azul

PASO 5: Monitoreo Post-Deploy
├─ Primeras 2 horas: vigilancia continua
├─ Errores en logs
├─ Performance (< 500ms para consolidados)
├─ Users reporting issues
└─ Si hay problema, rollback inmediato
```

### Opción 2: Canary Deployment (Alternativa)

```
TIMING: Horario normal pero monitoreado

PASO 1: Deploy a 10% de usuarios
├─ Servidor 1 de 10 tiene nueva versión
├─ 90% en versión vieja
├─ Monitorear errores por 1 hora

PASO 2: Aumentar a 50%
├─ Si no hay errores, deploy a 5 servidores
├─ Monitorear por 30 minutos

PASO 3: Rollout completo
├─ Deploy a todos los servidores
├─ Monitorear por 2 horas más

VENTAJA: Sin downtime
DESVENTAJA: Más complejo de reverter si algo falla
```

---

## 📦 Pasos de Deployment Detallado

### Pre-Deployment (T-1 hora antes)

```bash
# 1. Crear backup de BD de producción
pg_dump -h prod.db.host -U postgres -d healthyapp > backup_2025_02_XX.sql

# 2. Verificar estado actual
git status                          # Sin cambios uncommitted
git log --oneline -5               # Ver commits recientes
npm run build                      # Build exitoso

# 3. Crear release tag
git tag -a v2.0.0 -m "Sprint A+B+C + Gramajes Base"
git push origin v2.0.0

# 4. Notificar al equipo
# "Deployment iniciando en X minutos"
```

---

### Deployment (T hora 0)

#### A. En Ambiente QA (si existe)

```bash
# 1. Checkout del código
cd /var/www/healthy-app
git fetch origin
git checkout v2.0.0

# 2. Instalar dependencias
npm ci  # (mejor que npm install en producción)

# 3. Ejecutar migraciones SQL
psql -h qa.db.host -U postgres -d healthyapp < sql/fix_sprint_a.sql
psql -h qa.db.host -U postgres -d healthyapp < sql/fix_sprint_c.sql

# 4. Compilar
npm run build

# 5. Ejecutar smoke tests
npm run test:smoke  # Si existe

# 6. Iniciar servicio
systemctl restart healthy-app-qa

# 7. Verificar health check
curl -s http://qa.healthy-app.com/health | jq .
```

#### B. En Ambiente PROD

```bash
# 1. Mantener versión anterior lista para rollback
cp -r /var/www/healthy-app /var/www/healthy-app-backup-v1.9.0

# 2. Checkout nuevo código
cd /var/www/healthy-app
git fetch origin
git checkout v2.0.0

# 3. Instalar dependencias
npm ci

# 4. Ejecutar migraciones SQL (CRÍTICO)
# ORDEN IMPORTA:
psql -h prod.db.host -U postgres -d healthyapp < sql/fix_sprint_a.sql
# Esperar 2 minutos
psql -h prod.db.host -U postgres -d healthyapp < sql/fix_sprint_c.sql

# 5. Compilar
npm run build

# 6. Parar servicio viejo (graceful shutdown)
systemctl stop healthy-app
sleep 5  # Esperar requests existentes

# 7. Actualizar archivos estáticos
rm -rf /var/www/healthy-app/dist
cp -r /var/www/healthy-app/dist /var/www/html/  # Servidor web

# 8. Reiniciar servicio
systemctl start healthy-app

# 9. Esperar startup (30-60s)
sleep 30

# 10. Verificar health check
curl -s http://prod.healthy-app.com/health | jq .
# Esperado: {"status":"ok","version":"2.0.0"}
```

---

## ⚠️ Rollback Plan

### Si el deployment falla (DO WITHIN 5 MINUTES)

```bash
# 1. Detener servicio actual
systemctl stop healthy-app

# 2. Revertir código a versión anterior
cd /var/www/healthy-app
git checkout v1.9.0  # versión anterior

# 3. Revertir BD si cambios afectaron datos
# NO ejecutar rollback SQL si no es necesario
# Los cambios de Sprint A/C son backward compatible

# 4. Reiniciar servicio
systemctl start healthy-app

# 5. Verificar
curl -s http://prod.healthy-app.com/health | jq .
# Esperado: {"status":"ok","version":"1.9.0"}

# 6. Notificar al equipo
# "Deployment reverted due to [razón específica]"

# 7. Agendar follow-up
# Diagnosticar qué salió mal y reintentar
```

---

## 🔍 Verificaciones Post-Deployment

### Inmediato (Primeros 5 minutos)

```bash
# 1. Health check
curl -s http://prod.healthy-app.com/health

# 2. Ver logs
tail -f /var/log/healthy-app/app.log | head -20

# 3. Buscar errores
grep -i error /var/log/healthy-app/app.log | tail -10

# 4. Verificar conexión a BD
psql -h prod.db.host -U postgres -d healthyapp -c "SELECT NOW();"

# 5. Revisar métricas
# Prometheus, Grafana, o herramienta de monitoreo
# - CPU < 50%
# - Memory < 70%
# - Request latency < 500ms
# - Error rate < 0.1%
```

### Funcional (Primeros 30 minutos)

```
☐ Chef Dashboard carga sin errores
☐ Puede crear nuevo ciclo
☐ Botón "Activar Ciclo" visible y funciona
☐ Botón "Gramajes" visible para cada operación
☐ Modal Gramajes Base abre correctamente
☐ Puede editar y guardar gramajes
☐ Datos persisten al reabrir modal

☐ Ciclo Editor funciona normalmente
☐ Todos los servicios disponibles (6 servicios: desayuno, nueves, almuerzo, onces, cena, cena_ligera)
☐ Puede activar ciclo activo

☐ Coordinador puede crear pedido
☐ Ve el badge "Día X del Ciclo"
☐ Puede seleccionar solo dietas configuradas

☐ Supervisor puede ver consolidado
☐ Tab Ingredientes carga en <500ms
☐ Puede marcar como preparado
☐ Stock se descuenta automáticamente
```

### Extended (Próximas 2 horas)

```
☐ Monitorear logs por ERROR, WARN
☐ Revisar métricas de performance
☐ Feedback de usuarios en Slack/email
☐ Verificar sin picos de error rate
☐ Confirmar backups ejecutados
☐ Documentar en changelog
```

---

## 📊 Monitoreo Continuo

### Métricas a Vigilar

| Métrica | Umbral Normal | Umbral Alerta | Acción |
|---------|--------------|---------------|--------|
| **Error Rate** | <0.1% | >0.5% | Revisar logs, considerar rollback |
| **Response Time** | <500ms | >2s | Verificar BD queries, índices |
| **CPU** | <40% | >70% | Analizar qué cambió, scale si necesario |
| **Memory** | <50% | >80% | Memory leak? Reiniciar servicio |
| **DB Connections** | <20 | >50 | Posible connection leak |
| **Queue Depth** | <10 | >100 | Solicitudes acumulándose, bottleneck |

---

## 📝 Documentación de Cambios Entregables

Antes de cerrar el deployment, entregar:

```
✓ CAMBIOS_SESION_ACTUAL.md
  └─ Resumen ejecutivo de cambios

✓ GUIA_USO_GRAMAJES_BASE.md
  └─ Manual para chef y coordinadores

✓ RESUMEN_IMPLEMENTACION_COMPLETA.md
  └─ Documentación técnica completa

✓ FLUJOS_VISUALES.txt
  └─ Diagramas de flujos

✓ QA_CHECKLIST.md
  └─ Para equipo QA

✓ Este archivo (DEPLOYMENT_GUIDE.md)
  └─ Instrucciones de deployment

✓ SQL Migrations
  ├─ sql/fix_sprint_a.sql
  └─ sql/fix_sprint_c.sql

✓ Release Notes
  └─ Changelog con todos los cambios
```

---

## 🎓 Capacitación de Usuarios

Después del deployment, facilitar:

### Para Chefs
```
1. Acceso a GUIA_USO_GRAMAJES_BASE.md
2. Demo de 30 minutos:
   - Crear ciclo
   - Configurar gramajes base
   - Activar ciclo
3. Q&A session
4. Documento de troubleshooting
```

### Para Coordinadores
```
1. Demo de 15 minutos:
   - Ver badge "Día del Ciclo"
   - Crear pedido con ciclo activo
   - Ver solo dietas configuradas
2. Documentation en intranet
3. Contact para soporte
```

### Para Supervisores
```
1. Demo de 20 minutos:
   - Consolidado más rápido
   - Descuento de stock automático
   - Ingredientes cálculos correctos
2. Nota: Sin cambio visible en UI
3. Performance improvement destacado
```

---

## 🔗 Contactos de Emergencia

```
Equipo Técnico:
- Lead Developer: [nombre] [teléfono] [email]
- DevOps: [nombre] [teléfono] [email]
- DBA: [nombre] [teléfono] [email]

Escalation:
- Tech Manager: [nombre] [teléfono]
- VP Engineering: [nombre] [teléfono]

Slack Channels:
- #deployment-alerts
- #healthy-app-issues
- #engineering-on-call
```

---

## 📅 Calendario Sugerido

```
Lunes 24/02:    ☐ QA finaliza testing
Martes 25/02:   ☐ Team review de QA results
Miércoles 26/02: ☐ Deploy a QA (environment)
Jueves 27/02:   ☐ Final validation en QA
Viernes 28/02:  ☐ Deploy a PROD (22:00 - 00:00)
Lunes 3/03:     ☐ Capacitación usuarios
Martes 4/03:    ☐ Monitor y ajustes
```

---

## ✅ Sign-Off Deployment

- [ ] **Tech Lead**: ___________________ (fecha: ___)
- [ ] **QA Manager**: ___________________ (fecha: ___)
- [ ] **DevOps Lead**: ___________________ (fecha: ___)
- [ ] **Product Owner**: ___________________ (fecha: ___)

---

## 📞 Post-Deployment Support

**Primeras 48 horas:**
- [ ] Team disponible 24/7 en Slack
- [ ] Logs monitoreados continuamente
- [ ] Rollback plan activo

**Semana 1:**
- [ ] Daily standup para issues
- [ ] Monitor de performance
- [ ] Feedback de usuarios

**Semana 2+:**
- [ ] Sprint planning para issues encontrados
- [ ] Documentación de lessons learned
- [ ] Post-mortem si hubo problemas

---

**Deployment Guide versión 1.0**
**Última actualización:** Febrero 2025
**Status:** Ready to Use
