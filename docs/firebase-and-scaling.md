# Firebase y escalado

Este documento resume como esta app debe manejar Firebase, secretos y crecimiento futuro.

## Regla principal

En una app Expo / React Native, todo lo que empieza con `EXPO_PUBLIC_` termina dentro del bundle del cliente.
Eso significa:

- se puede usar para configuracion publica de Firebase
- no se debe tratar como un secreto real
- las credenciales sensibles deben vivir fuera de la app

## Que debe ir en `.env`

Usa variables como estas para la configuracion publica del proyecto Firebase:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Que no debe ir en la app

No debes incrustar en el cliente:

- claves privadas de service accounts
- tokens de administracion
- credenciales de Cloud Functions
- secretos de terceros

Esos valores deben quedarse en:

- secretos de CI
- variables de entorno del backend
- Firebase Functions / Cloud Run
- EAS Secrets si se usan builds gestionadas

## Flujo recomendado

1. El cliente Expo solo inicia Firebase con configuracion publica.
2. La autenticacion usa reglas y proveedores de Firebase Auth.
3. Los datos sensibles o tareas administrativas van a Cloud Functions o a un backend propio.
4. El acceso a Firestore se protege con Security Rules.
5. Si hace falta validar el dispositivo, agrega App Check.

## Estructura de datos sugerida

Para escalar bien, evita un documento gigante por usuario.
Mejor separar por colecciones:

- `users`
- `babies`
- `entries`
- `settings`
- `syncQueue`
- `exports`

Si la app crece a multi-bebe o multi-familia, usa referencias por `userId` y `babyId`.

## Reglas de Firestore

Puntos minimos:

- cada usuario solo puede leer sus datos
- cada familia solo puede leer los babies ligados a su cuenta
- las escrituras deben validar campos y tipos
- los contadores y summary docs deben actualizarse desde funciones confiables

## Escalado tecnico

Cuando el volumen suba:

- mueve agregaciones pesadas a Cloud Functions
- crea indices compuestos para consultas por fecha y tipo
- usa paginacion en historial e informes
- guarda snapshots resumidos por dia para no recalcular todo en cada pantalla
- usa Remote Config para flags de UI y experimentos
- separa entornos `dev`, `staging` y `prod`

## Escalado de UI

La UI actual funciona bien si se mantiene esta idea:

- una tarjeta principal por pantalla
- botones grandes pero pocos
- acciones rapidas en chips horizontales
- formularios en cards separadas
- visualizacion compacta para historial y reportes

## Que tocar primero si se quiere crecer

1. Definir esquema final de Firestore.
2. Escribir reglas seguras.
3. Mover operaciones derivadas a Functions.
4. Separar configuracion por entorno.
5. Anadir tests basicos de reglas y flujo de login.

## Nota importante

Si en el futuro se quiere ocultar valores verdaderamente sensibles, no basta con `.env` en el cliente.
Hay que sacarlos de la app y ponerlos en backend o en un secret manager.
