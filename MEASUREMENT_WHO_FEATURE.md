# 📏 Smart Measurement Entry - WHO Recommendations

## 🎯 Objetivo

Crear una entrada de medidas **intelligent y amigable** que:
1. Propone valores aproximados según la edad del bebé (datos WHO)
2. Muestra rangos saludables sin generar ansiedad
3. Da feedback positivo después de ingresar medidas
4. Evita hacer sentir mal a los padres si sus números no coinciden exactamente

---

## 🏗️ Arquitectura

### Archivo: `src/lib/who-recommendations.ts`

**Contiene:**
- Datos WHO para peso y talla según edad (0-36 meses)
- Funciones de cálculo de edad
- Categorización de medidas (bajo/normal/alto)
- Mensajes motivacionales personalizados

**Funciones principales:**

```typescript
// Obtiene la edad en meses desde la fecha de nacimiento
getAgeInMonths(birthDate: string): number

// Obtiene recomendación WHO según edad
getWHORecommendation(birthDate: string): WHORecommendation

// Categoriza el peso y proporciona feedback
getWeightCategory(weight: number, birthDate: string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
}

// Categoriza la talla y proporciona feedback
getHeightCategory(height: number, birthDate: string): {
  category: 'low' | 'healthy' | 'high';
  message: string;
  emoji: string;
}

// Obtiene valores sugeridos y mensaje motivacional
getSuggestedValues(birthDate: string): {
  weight: { value: number; min: number; max: number };
  height: { value: number; min: number; max: number };
  message: string;
}
```

---

## 🎨 UX Flow

### 1. **Primer vistazo (sin ingresar datos)**

```
💡 WHO Suggested Range
"¡Qué niño/a tan especial! Mira cómo crece"

┌─────────────────────────┐
│ 📏 Peso                │ 📏 Talla
│ 5.8 kg                 │ 61.5 cm
│ 6.0 - 7.2 kg (rango)   │ 55.5 - 62.4 cm
└─────────────────────────┘

Mesures actuelles

[Poids (kg)     ] ← placeholder suggerido
[Taille (cm)    ] ← placeholder suggerido
```

### 2. **Después de ingresar peso**

Si el usuario ingresa `6.5 kg`:

```
[Poids (kg): 6.5 ]
✨ ¡Perfecto! Tu bebé está en un rango muy saludable 💚
```

Si ingresa `5.0 kg` (bajo):

```
[Poids (kg): 5.0 ]
👶 Un poquito más bajo de lo esperado para su edad. 
   Consulta con tu pediatra si tienes preocupaciones 💙
```

Si ingresa `7.5 kg` (alto):

```
[Poids (kg): 7.5 ]
🎉 Un poquito más alto de lo esperado para su edad. 
   Normal en bebés muy activos 💪
```

### 3. **Después de ingresar talla**

Mismo patrón que peso, pero para altura.

---

## 💚 Tone & Voice

**Principios:**
1. ✅ **Nunca juzgar** - Los números son referencias, no estándares
2. ✅ **Siempre positivo** - Énfasis en lo saludable del bebé
3. ✅ **Emojis amigables** - Mantienen tono cálido
4. ✅ **Validar diferencias** - "Cada bebé es único"
5. ✅ **Empoderar padres** - No generar ansiedad

**Ejemplos de mensajes:**

| Escenario | Mensaje |
|-----------|---------|
| Peso normal | ✨ ¡Perfecto! Tu bebé está en un rango muy saludable 💚 |
| Peso bajo | 👶 Un poquito más bajo. Consulta con tu pediatra si tienes preocupaciones 💙 |
| Peso alto | 🎉 Un poquito más alto. Normal en bebés muy activos 💪 |
| Al entrar | 💡 Cada bebé es único 💚 |

---

## 📊 Datos WHO Incluidos

### Edades cubiertas:
- 0 meses (recién nacido)
- 1-6 meses (cada mes)
- 9, 12, 18, 24, 36 meses

### Para cada edad:
- Peso: mediana, mín (percentil 5), máx (percentil 95)
- Talla: mediana, mín (percentil 5), máx (percentil 95)
- Mensaje motivacional personalizado

### Ejemplo de datos:

```typescript
{
  ageMonths: 6,
  ageLabel: '6 meses',
  weight: { min: 6.0, median: 7.8, max: 9.2 },
  height: { min: 61.9, median: 65.7, max: 68.9 },
  positiveMessage: '¡Medio año! Mira cuánto ha crecido tu bebé 💚'
}
```

---

## 🔧 Integración en Entry Screen

**Archivo:** `app/(app)/entry/[type].tsx`

### Cambios:

1. **Import:**
```typescript
import { 
  getSuggestedValues, 
  getWeightCategory, 
  getHeightCategory 
} from '@/lib/who-recommendations';
```

2. **Lógica:**
```typescript
const suggested = profile?.babyBirthDate 
  ? getSuggestedValues(profile.babyBirthDate) 
  : null;

const weightCat = weightKg && profile?.babyBirthDate 
  ? getWeightCategory(Number(weightKg), profile.babyBirthDate) 
  : null;
```

3. **Render:**
- Box con sugerencias (si existen)
- Input de peso con feedback
- Input de talla con feedback
- Input de perímetro craneal (sin feedback)
- Input de temperatura (sin feedback)

---

## 📱 Soporte Multi-idioma

**Idiomas:** FR, ES, EN, NL

**Frases key:**
```typescript
'Suggestion selon OMS' / 'WHO Suggested Range'
'Mesures actuelles' / 'Current Measurements'
'Poids' / 'Weight'
'Taille' / 'Height'
```

---

## ✅ Testing Checklist

- [ ] App carga sin errores
- [ ] WHO suggestions se muestran correctamente
- [ ] Placeholders suggeridos aparecen en inputs
- [ ] Feedback positivo aparece para peso/talla normal
- [ ] Feedback cautivo aparece para peso/talla bajo
- [ ] Feedback alegre aparece para peso/talla alto
- [ ] Mensajes están traducidos correctamente
- [ ] Emojis se muestran bien en web y mobile
- [ ] Sin perficar latitud en multi-idioma

---

## 🚀 Future Enhancements

1. **Gráficos de crecimiento**: Mostrar tendencia en el tiempo
2. **Percentil exacto**: Calcular percentil real vs WHO
3. **Alertas pediatra**: Flag si valores muy fuera de rango
4. **Comparación con hermanos**: Si hay múltiples bebés
5. **Exportar PDF**: Con recomendaciones para pediatra

---

## 📝 Notas de Diseño

- **Colors:** Usa `meta.tone` (color del entry type)
- **Typography:** Jerarquía clara (title > value > range)
- **Spacing:** Consistent padding (12px)
- **Border:** Subtle 1.5px border con alpha 10% background
- **Feedback:** Inline, color-coded (verde=healthy, amarillo=cautivo, azul=bajo)

---

## 🎓 Educación de Padres

**Mensaje que se podría agregar (futuro):**

> "Estos son rangos según la OMS basados en bebés saludables. Cada bebé es único y crece a su propio ritmo. Si tienes preocupaciones, consulta siempre con tu pediatra. ¡Eres un papá/mamá increíble! 💚"

---

## Referencias

- [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards)
- [Percentil definitions](https://www.ncbi.nlm.nih.gov/books/NBK221834/)
- [Baby growth tracking best practices](https://www.pediatrics.org/)
