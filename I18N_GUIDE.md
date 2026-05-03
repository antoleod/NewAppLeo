# 🌍 Guía de Internacionalización (i18n)

## Estructura

```
src/
├── locales/
│   ├── fr.json      (Francés)
│   ├── es.json      (Español)
│   ├── en.json      (Inglés)
│   └── nl.json      (Holandés)
├── lib/
│   └── i18n.ts      (Utilidades de traducción)
└── hooks/
    └── useTranslation.ts (Hook para componentes)
```

## Uso en Componentes

### Opción 1: Hook `useTranslation()` (Recomendado)

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('food.history')}</Text>
      <Text>{t('common.save')}</Text>
      <Button label={t('common.delete')} />
    </View>
  );
}
```

### Opción 2: Hook `useLocale()` + `getTranslation()` (Para lógica)

```typescript
import { useLocale } from '@/context/LocaleContext';
import { getTranslation } from '@/lib/i18n';

export function MyComponent() {
  const { language } = useLocale();
  const translation = getTranslation(language, 'food.history');

  return <Text>{translation}</Text>;
}
```

### Opción 3: Traducciones por Lotes

```typescript
const { batch } = useTranslation();

const translations = batch([
  'food.history',
  'common.save',
  'vaccine.scheduled',
]);

// translations = {
//   'food.history': '...',
//   'common.save': '...',
//   'vaccine.scheduled': '...'
// }
```

## Añadir Nuevas Traducciones

1. **Añadir la clave a todos los JSON**

   `src/locales/es.json`:
   ```json
   {
     "mySection": {
       "myKey": "Mi valor en español"
     }
   }
   ```

   `src/locales/fr.json`:
   ```json
   {
     "mySection": {
       "myKey": "Ma valeur en français"
     }
   }
   ```

   `src/locales/en.json`:
   ```json
   {
     "mySection": {
       "myKey": "My value in English"
     }
   }
   ```

   `src/locales/nl.json`:
   ```json
   {
     "mySection": {
       "myKey": "Mijn waarde in het Nederlands"
     }
   }
   ```

2. **Usar en componente**

   ```typescript
   const { t } = useTranslation();
   <Text>{t('mySection.myKey')}</Text>
   ```

## Ejemplo: Migración de home.tsx

### Antes (Hardcoded):
```typescript
<Text>{language === 'fr' ? 'SANTÉ' : 'HEALTH'}</Text>
<Text>{language === 'fr' ? 'Bonjour' : 'Good morning'}</Text>
<Text>{language === 'fr' ? 'HISTORIQUE COMIDAS' : 'FOOD HISTORY'}</Text>
```

### Después (Con i18n):
```typescript
const { t } = useTranslation();

<Text>{t('health.status')}</Text>
<Text>{t('greeting.morning')}</Text>
<Text>{t('food.history')}</Text>
```

## Claves Disponibles

### Secciones

- **common**: Botones y acciones comunes (save, cancel, delete, etc.)
- **greeting**: Saludos según hora del día
- **health**: Estado de salud y temperatura
- **food**: Comidas y reacciones alérgicas
- **feeding**: Información de alimentación (pecho/biberón)
- **vaccine**: Información de vacunas
- **growth**: Crecimiento y medidas
- **recent**: Actividad reciente
- **hydration**: Hidratación
- **milk**: Progreso de leche
- **entry**: Labels de entrada de datos
- **measurement**: Medidas (peso, altura, etc.)
- **modal**: Modales y diálogos
- **errors**: Mensajes de error

## Formato con Variables

```typescript
const { format } = useTranslation();

// Suponiendo que en el JSON hay:
// "greeting": "Hola {name}, es {time}"

format('greeting', {
  name: 'Juan',
  time: '9 AM',
}); // => "Hola Juan, es 9 AM"
```

## Idiomas Soportados

- 🇫🇷 **Francés** (fr)
- 🇪🇸 **Español** (es)
- 🇬🇧 **Inglés** (en)
- 🇳🇱 **Holandés** (nl)

## Validación

Para asegurar que todas las traducciones estén completas:

```bash
# Verificar que todas las claves existan en todos los idiomas
node scripts/validate-i18n.js
```

## Tips

1. **Usar notación punto para anidación**: `food.history` es mejor que `food_history`
2. **Mantener estructura consistente**: Mismas claves en todos los JSON
3. **Ser específico**: `food.history` es mejor que `history`
4. **Comentarios en JSON**: Usar en secciones complejas
5. **Prueba en todos los idiomas**: Algunos textos pueden ser más largos en ciertos idiomas

## Checklist para Nueva Feature

- [ ] Añadir claves a los 4 JSON (fr, es, en, nl)
- [ ] Crear hook `useTranslation()`
- [ ] Reemplazar strings hardcodeados con `t('key')`
- [ ] Probar en todos los idiomas
- [ ] Revisar longitud de textos largos
