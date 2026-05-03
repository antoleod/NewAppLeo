# Plan de Mejoras — NewAppLeo

> Plan de mejoras prioritizadas basado en auditoría del código (mayo 2026).
> Foco: pulido visual, features incompletas y mantenibilidad.

---

## Resumen ejecutivo

La app está funcionalmente completa pero con varios puntos donde se nota "falta de pulido" — transiciones bruscas, sin feedback háptico, alerts bloqueantes, y archivos demasiado grandes. Este plan ataca lo que más impacta la sensación de calidad **percibida** primero, y deja la deuda técnica para una segunda fase.

**Orden recomendado:** Fase 1 (ganancias visibles rápidas) → Fase 2 (features incompletas) → Fase 3 (refactor / deuda técnica).

---

## FASE 1 — Pulido visual y UX (impacto inmediato)

### 1.1 Skeleton loading en Home
**Problema:** [home.tsx](app/(app)/(tabs)/home.tsx) salta de pantalla vacía a contenido cargado de forma brusca.
**Solución:**
- Crear componente `<Skeleton />` reutilizable en [src/components/ui.tsx](src/components/ui.tsx) con animación shimmer.
- Aplicar a las cards principales: NextFeedingCard, últimas entradas, stats del día.
- Usar mientras `loading === true` en `AppDataContext`.

**Archivos a tocar:** `src/components/ui.tsx`, `app/(app)/(tabs)/home.tsx`, `src/components/NextFeedingCard.tsx`
**Esfuerzo:** ~2h
**Impacto:** ⭐⭐⭐⭐⭐

---

### 1.2 Feedback háptico
**Problema:** Botones críticos (guardar entrada, iniciar/detener timer, swipe-to-delete) no vibran. La app se siente "muerta" en mobile.
**Solución:**
- Instalar / verificar `expo-haptics` (probablemente ya está como dep de Expo).
- Crear helper `src/lib/haptics.ts` con: `light()`, `medium()`, `success()`, `warning()`, `error()`.
- Aplicar en:
  - Guardar entrada → `success()`
  - Iniciar timer → `medium()`
  - Botones de tab → `light()`
  - Eliminar → `warning()`
  - Errores → `error()`

**Archivos a tocar:** nuevo `src/lib/haptics.ts`, `entry/[type].tsx`, `TimerWidget.tsx`, `_layout.tsx` de tabs
**Esfuerzo:** ~1.5h
**Impacto:** ⭐⭐⭐⭐⭐

---

### 1.3 Toast / Snackbar en lugar de Alert.alert
**Problema:** Mensajes como "guardado", "foto removida", "error de red" usan `Alert.alert` que bloquea la pantalla con un modal nativo. Anti-patrón en apps modernas.
**Solución:**
- Crear `<ToastProvider />` + hook `useToast()` en `src/components/Toast.tsx`.
- Variantes: `success` (verde), `error` (rojo), `info` (gris).
- Posición: bottom, con safe-area, auto-dismiss en 3s.
- Reemplazar **solo los Alerts informativos** (no los de confirmación destructiva).

**Archivos a tocar:** nuevo `src/components/Toast.tsx`, `app/_layout.tsx` (montar provider), buscar todos los `Alert.alert(` no destructivos.
**Esfuerzo:** ~3h
**Impacto:** ⭐⭐⭐⭐

---

### 1.4 Empty states ilustrados en Insights
**Problema:** [insights.tsx](app/(app)/(tabs)/insights.tsx) sin datos se ve vacío y poco motivador.
**Solución:**
- Componente `<EmptyState icon title message ctaLabel onCta />` reutilizable.
- En Insights: ícono grande + "Aún no hay suficientes datos" + CTA "Registrar primera comida".
- Aplicar también a History vacío.

**Archivos a tocar:** `src/components/ui.tsx` (añadir EmptyState), `insights.tsx`, `history.tsx`
**Esfuerzo:** ~1.5h
**Impacto:** ⭐⭐⭐

---

### 1.5 Animaciones de entrada/salida
**Problema:** Las cards aparecen sin transición. El header de entrada cambia bruscamente entre tipos.
**Solución:**
- Usar `react-native-reanimated` (ya está en el stack Expo).
- `FadeInDown.springify()` para items de listas.
- `Layout.springify()` en cambios de altura.
- Transición de tab al entrar a `entry/[type]`.

**Esfuerzo:** ~2h
**Impacto:** ⭐⭐⭐

---

## FASE 2 — Features incompletas

### 2.1 Búsqueda en History
**Problema:** [history.tsx](app/(app)/(tabs)/history.tsx) solo filtra por tipo, no permite buscar por fecha/texto.
**Solución:**
- Barra de búsqueda con debounce (300ms).
- Filtro combinado: tipo + texto (busca en notas) + rango de fechas.
- Botón de "limpiar filtros" cuando hay alguno activo.

**Esfuerzo:** ~3h
**Impacto:** ⭐⭐⭐⭐

---

### 2.2 Completar migración i18n
**Problema:** Hay textos hardcodeados en francés ("Tout", "Mesure", "Symptome") en varias pantallas. La memoria indica ~15 pantallas pendientes.
**Solución:**
- Auditar grep de strings en español/francés/inglés hardcodeados.
- Mover a [src/locales/](src/locales/) (ya existen los 4 idiomas: en/es/fr/nl).
- Usar `t()` desde [src/lib/i18n.ts](src/lib/i18n.ts).
- Prioridad: tabs principales → entry → settings → modales secundarios.

**Esfuerzo:** ~6h (distribuido en varios sprints)
**Impacto:** ⭐⭐⭐⭐

---

### 2.3 Estados de error y reintento
**Problema:** Si Firestore falla, la pantalla queda en "loading" o vacía sin información. No hay reintento manual.
**Solución:**
- Componente `<ErrorState onRetry />`.
- Captar errores en `AppDataContext` y exponer `error` además de `loading` y `data`.
- Mostrar banner discreto + botón "Reintentar" cuando hay error de red.

**Esfuerzo:** ~2h
**Impacto:** ⭐⭐⭐

---

### 2.4 Accesibilidad básica
**Problema:** Falta `accessibilityLabel`, `accessibilityRole` y `accessibilityHint` en componentes interactivos.
**Solución:**
- Auditar botones, cards tappable, FAB.
- Añadir labels descriptivos (no solo el texto visible).
- `accessibilityRole="button"` en Pressables.
- Probar con TalkBack/VoiceOver.

**Esfuerzo:** ~4h
**Impacto:** ⭐⭐⭐ (alto si la app va a publicarse)

---

## FASE 3 — Calidad de código (deuda técnica)

### 3.1 Dividir archivos monstruosos
**Problema:**
- [home.tsx](app/(app)/(tabs)/home.tsx) → **1,524 líneas**
- [entry/[type].tsx](app/(app)/entry/[type].tsx) → **1,638 líneas**

Son inmantenibles, lentos para hot-reload y difíciles de revisar.

**Solución para home.tsx:**
- Extraer a `src/components/home/`:
  - `<TodayStatsRow />`
  - `<QuickActionsGrid />`
  - `<RecentEntriesSection />`
  - `<QuickTimerSheet />`
- Mover formatters (`formatRelative`, `formatClock`) a `src/lib/format.ts`.

**Solución para entry/[type].tsx:**
- Un archivo por tipo de entrada en `src/components/entry/`:
  - `<BreastEntryForm />`, `<BottleEntryForm />`, `<DiaperEntryForm />`, `<MeasurementEntryForm />`, `<SymptomEntryForm />`, `<VaccineEntryForm />`...
- El `[type].tsx` queda solo con el routing/switch.

**Esfuerzo:** ~8h (dos sesiones de refactor)
**Impacto:** ⭐⭐⭐⭐ (mejora velocidad de desarrollo a futuro)

---

### 3.2 Extraer constantes y configuración
**Problema:** Magic numbers y strings dispersos (durations de timers, límites de cantidad, paths de assets).
**Solución:**
- `src/constants/timers.ts`, `src/constants/limits.ts`.
- Centralizar todo lo configurable.

**Esfuerzo:** ~1h
**Impacto:** ⭐⭐

---

### 3.3 Tipado más estricto
**Problema:** Algunos `any` y `as` casts revisados en componentes.
**Solución:**
- Pasar `tsc --noEmit` y revisar warnings.
- Reemplazar `any` por tipos concretos donde sea trivial.
- No hacer un strict-mode total — solo limpiar lo accesible.

**Esfuerzo:** ~2h
**Impacto:** ⭐⭐

---

## Recomendación de orden de ejecución

**Sprint 1 (esta semana — máxima visibilidad):**
1. Feedback háptico (1.2) — 1.5h
2. Skeleton loading Home (1.1) — 2h
3. Empty states (1.4) — 1.5h

→ **5h totales, app se siente notablemente más pulida.**

**Sprint 2 (siguiente — pulir y completar):**
4. Toast system (1.3) — 3h
5. Búsqueda en History (2.1) — 3h
6. Animaciones de entrada (1.5) — 2h

**Sprint 3 (cuando haya tiempo — deuda):**
7. Dividir `home.tsx` (3.1a) — 4h
8. Dividir `entry/[type].tsx` (3.1b) — 4h
9. Completar i18n (2.2) — 6h distribuidos

**Sprint 4 (pre-release):**
10. Estados de error (2.3) — 2h
11. Accesibilidad (2.4) — 4h
12. Tipado / constantes (3.2 + 3.3) — 3h

---

## Métricas de éxito

- **Sensación premium:** test con 3 usuarios reales después de Sprint 1, comparar antes/después.
- **Velocidad de desarrollo:** tiempo de hot-reload tras dividir archivos grandes.
- **Cobertura i18n:** 100% de strings visibles pasan por `t()`.
- **Crash-free:** estados de error capturados, no más "pantalla en blanco".

---

## Notas

- No tocar la lógica de negocio (cálculos de feeding intervals, estadísticas) en este plan — eso ya funciona.
- Mantener compatibilidad con el sistema de temas actual ([src/theme.ts](src/theme.ts)) en todos los componentes nuevos.
- Cada componente nuevo debe respetar el dark mode desde el día uno.
