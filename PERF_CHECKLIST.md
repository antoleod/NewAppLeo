# Checklist de Performance & Escalabilidad — NewAppLeo

> Basado en [PERF_AUDIT.md](PERF_AUDIT.md). Orden = impacto × esfuerzo. Marca cada casilla al completar.
> **Antes de empezar:** crea una rama → `git checkout -b perf/audit-fixes`
> **Verificación global tras cada bloque:** `npm run typecheck && npm run lint && npm test`

---

## 🟢 FASE 1 — Quick Wins (≈2.5 h, bajo riesgo)

### [x] 1. Índice compuesto en Firestore (Finding 1) — ✅ **VERIFICADO: no se requiere cambio (falso positivo)**
- La query en [AppDataContext.tsx:250](src/context/AppDataContext.tsx#L250) es `orderBy('occurredAt','desc') + limit` de **un solo campo**. Firestore auto-crea índices de campo único (ambas direcciones), así que ya se sirve desde índice — no hace falta índice compuesto.
- Además, la JSON sugerida por el audit metía un campo único en el array `indexes` (que solo acepta compuestos de 2+ campos) → `firebase deploy` lo rechazaría.
- El índice compuesto realmente útil (`type + occurredAt`) corresponde al **ítem 12**, cuando las queries lo usen.

### [x] 2. `getWeeklyTrend` → una sola pasada O(n) (Finding 6) — ✅ hecho
- [x] Reescrito [entries.ts:117](src/utils/entries.ts#L117): bucket único por `startOfDay().getTime()` (1 pasada en vez de 7); misma semántica, keys/labels idénticos
- [x] typecheck + lint + test verdes
- _Nota: el audit insinuaba un bug en `dateKey`; verificado que NO existe — vive en [date.ts:68](src/utils/date.ts#L68) y maneja `string | Date` correctamente._

### [x] 3. Caché en memoria para `getAppSettings` / `getBabies` (Finding 8) — ✅ hecho
- [x] `getAppSettings` **ya estaba cacheado** en el código real (`_settingsCache`, [storage.ts:296](src/lib/storage.ts#L296)) — sin cambios necesarios
- [x] Añadido `_babiesCache` + `_activeBabyIdCache` con write-through en [storage.ts](src/lib/storage.ts)
- [x] Invalidación en **todos** los writers: `saveBaby`, `removeBaby`, `setActiveBabyId`, y `clearLocalSession` (logout) vía `invalidateBabiesCache()`
- [x] Verificado: no hay otros writers a `BABIES_KEY`/`ACTIVE_BABY_KEY` fuera de storage.ts → sin regresión de staleness

### [x] 4. Índice de búsqueda pre-construido en history (Finding 7) — ✅ hecho
- [x] En [history.tsx:535](app/(app)/(tabs)/history.tsx#L535) dividido en dos memos: `searchableTimeline` (haystack, deps `[entries, filter, t]`) + `timelineEntries` (filtro barato, deps `[searchableTimeline, normalizedQuery]`)
- [x] Teclear ya no recalcula `getDetail()` por entry

### [x] 5. Regla `isPairedMember`: reducir `get()` (Finding 11) — ✅ probado y desplegado
- [x] Editado [firestore.rules:14](firestore.rules#L14): helper `pairedSessionMatches` con un solo `get()` enlazado (antes 2 get()); se mantiene `exists()` como guard
- [x] Probado con emulador `firebase emulators:start`: caso emparejado válido permitido + uid no autorizado rechazado (403)
- [x] Desplegado con `npm run firebase:deploy:rules` (ruleset `1c5e9a9d-79fd-4a95-a25a-00ac13c944e9`)

### [x] 6. Inicializar `syncState` a `'syncing'` (gap de readiness) — ✅ hecho
- [x] [AppDataContext.tsx:123](src/context/AppDataContext.tsx#L123) `'synced'` → `'syncing'`; el efecto guest pone `'synced'` y el online transiciona tras el primer `onSnapshot`

---

## 🟡 FASE 2 — Medio plazo (≈6–8 h, refactor moderado)

### [ ] 7. Subir `smartAlerts` + `meanInterval` a contexto/hook compartido (Finding 5) — `2 h`
- [ ] Crear `useDerivedEntries(entries, profile)` (o moverlos a `AppDataContext`) gestionando la dependencia i18n dentro del hook
- [ ] Reemplazar usos en [home.tsx:664](app/(app)/(tabs)/home.tsx#L664) e [insights.tsx:148,151](app/(app)/(tabs)/insights.tsx#L148)
- **Hecho cuando:** `buildSmartAlerts` / `getMeanFeedingInterval` se calculan **una** vez por cambio de `entries`.

### [ ] 8. `updateProfile`: no releer Firestore tras cada save (Finding 4) — `1 h`
- [ ] En [userProfileService.ts:190-213](src/services/userProfileService.ts#L190) construir el merge desde caché local en vez de `loadProfile`
- [ ] Verificar callers: `saveProfile`, `setThemeMode`, `completeUserOnboarding`, `claimUsername`
- **Hecho cuando:** un save = 1 `setDoc`, 0 `getDoc` extra.
- **⚠️ Correctitud:** asegurar que el `updatedAt` local no pisa datos remotos más recientes en escenarios multi-dispositivo.

### [ ] 9. `addEntry`: escritura local fire-and-forget en online (Finding 3, Opción A) — `1 h`
- [ ] En [AppDataContext.tsx:438](src/context/AppDataContext.tsx#L438) usar `void upsertLocalEntry(...)` sin `await` en el camino online feliz
- [ ] Confirmar que `onSnapshot` actualiza el estado correctamente (sin perder la entry si falla la escritura local)
- **Hecho cuando:** `addEntry` ya no bloquea por la deserialización O(n) local.

### [ ] 10. Integrar Crashlytics o Sentry (gap crítico de observabilidad) — `2–4 h`
- [ ] Crear `src/lib/telemetry.ts` con wrapper de reporte de errores
- [ ] Reportar en catch de `flushQueuedOperations` ([sync.ts:134,161](src/lib/sync.ts#L134)) y en el error handler de `onSnapshot`
- [ ] Configurar DSN/keys vía `EXPO_PUBLIC_*` y documentar en CLAUDE.md
- **Hecho cuando:** una op de sync descartada genera un evento en el dashboard, no solo `console.warn`.

### [ ] 11. Throttle `refreshPendingCount` (1 vez / 2 s) (Finding 9) — `30 min`
- [ ] Añadir guard con `useRef` de timestamp en [AppDataContext.tsx:127](src/context/AppDataContext.tsx#L127)
- **Hecho cuando:** múltiples snapshots seguidos (reconexión) no disparan ráfaga de lecturas.

---

## 🔴 FASE 3 — Arquitectural (planificar; próximo trimestre)

### [ ] 12. Índice por tipo + paginar/elevar `ENTRIES_PAGE_LIMIT` (Finding 2)
- [ ] Añadir índice compuesto `type ASC + occurredAt DESC` a [firestore.indexes.json](firestore.indexes.json)
- [ ] Migrar filtros de [history.tsx](app/(app)/(tabs)/history.tsx) a query server-side `where('type','==',...)`
- [ ] Decidir estrategia de paginación por cursor para >500 entries
- **Hecho cuando:** usuarios con >500 entries ya no ven datos truncados silenciosamente.

### [ ] 13. AsyncStorage: `Record<id, EntryRecord>` en vez de array (Finding 3, Opción B)
- [ ] Migración única en `getLocalEntries` ([localStore.ts](src/services/localStore.ts))
- [ ] Upsert/delete O(1); tests de migración para datos existentes
- **Hecho cuando:** upsert local es O(1) y datos antiguos migran sin pérdida.

### [ ] 14. Firebase App Check (rate limiting / integridad)
- [ ] Activar App Check en consola + SDK; añadir regla de validación de `occurredAt is string` en [firestore.rules](firestore.rules)
- **Hecho cuando:** clientes sin App Check token no pueden escribir entries.

### [ ] 15. Firebase Performance Monitoring en hot paths
- [ ] Trazas alrededor del procesado de snapshot y latencia de escritura en [AppDataContext.tsx](src/context/AppDataContext.tsx)
- **Hecho cuando:** p50/p99 de query y profundidad de cola visibles en dashboard.

### [ ] 16. Mover `buildSmartAlerts` fuera del hilo UI en web
- [ ] Web worker (o `InteractionManager` en native) para el cómputo O(n)
- **Hecho cuando:** el cómputo no bloquea el render en web con muchos entries.

---

## 🧪 FASE 4 — Load Testing (validación, sin baseline actual)
### [ ] 17. Montar plan de carga con Artillery
- [ ] Generar `tokens.csv` (tokens Firebase Auth de prueba)
- [ ] Crear `artillery-plan.yml` (rampa 1→100→1000; ver YAML en el output del audit)
- [ ] Ejecutar y registrar breaking points reales en [PERF_AUDIT.md](PERF_AUDIT.md) (sección LOAD TESTING)
- **Hecho cuando:** breaking points medidos reemplazan las proyecciones del audit.

---

## ✅ Cierre
- [ ] `npm run typecheck && npm run lint && npm test` en verde
- [ ] `npm run build:web` sin errores
- [ ] Re-puntuar **Production Readiness** (objetivo: 58 → 80+)
- [ ] Actualizar [PERF_AUDIT.md](PERF_AUDIT.md) marcando findings resueltos
- [ ] PR con resumen de ganancias medidas

### Tracking de progreso
| Fase | Total | Hechos |
|------|-------|--------|
| Quick Wins (1–6) | 6 | 6 ✅ |
| Medio plazo (7–11) | 5 | 0 |
| Arquitectural (12–16) | 5 | 0 |
| Load testing (17) | 1 | 0 |
| **Total** | **17** | **6** |
