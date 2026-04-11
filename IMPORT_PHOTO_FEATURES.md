# 📥 Import & Background Photo Features

## 🎯 Nuevas Características Agregadas

### 1. **Data Importer** - Importar datos desde JSON

Allows users to import feeding, diaper, and sleep data from JSON files directly into the app.

### 2. **Background Photo Selector** - Personalizar fondo de la app

Users can now upload custom background photos directly from settings.

## 📁 Archivos Creados

### `src/lib/importExport.ts`

**Service de importación/exportación de datos**

```typescript
// Parse and validate JSON
parseImportData(jsonString): any

// Convert feeds format
importFeeds(rawFeeds): Entry[]

// Convert diapers format
importDiapers(rawDiapers): Entry[]

// Convert sleeps format
importSleeps(rawSleeps): Entry[]

// Auto-detect type and import
importJsonData(data): Entry[]

// Batch import entries
batchImportEntries(entries, addEntry)

// Export entries to JSON
exportEntriesToJson(entries, filename)

// Validator class
class ImportValidator {
  validateFeeds(feeds)
  validateDiapers(diapers)
  validateSleeps(sleeps)
  getImportSummary(entries)
}
```

### `src/components/DataImporter.tsx`

**UI Component para importar datos**

```tsx
<DataImporter
  onImportStart={() => console.log("Importing...")}
  onImportComplete={(count, errors) => {
    console.log(`Imported ${count} entries`);
  }}
  onError={(error) => console.error(error)}
/>
```

**Features:**

- File picker para JSON
- Auto-detect data type (feeds, diapers, sleeps)
- Preview before import
- Summary statistics
- Error handling

### `src/components/BackgroundPhotoSelector.tsx`

**UI Component para seleccionar foto de fondo**

```tsx
<BackgroundPhotoSelector
  currentPhotoUri={backgroundPhotoUri}
  onPhotoSelected={(uri) => savePhoto(uri)}
  onPhotoRemoved={() => removePhoto()}
  isLoading={false}
/>
```

**Features:**

- Image picker from device gallery
- Photo preview (16:9 aspect ratio)
- Auto compress to 80% quality
- Visual feedback states
- Tips and guidance
- Loading indicator

## 🔄 Flujo de Importación

### 1. **Seleccionar archivo JSON**

```
Usuario toca "Choose JSON File"
↓
Image picker abre documentos
↓
Usuario selecciona archivo .json
```

### 2. **Preview de datos**

```
App lee el JSON
↓
Auto-detecta tipo (feeds, diapers, sleeps)
↓
Muestra preview con cantidad de items
↓
Usuario confirma o cancela
```

### 3. **Importar datos**

```
Si usuario confirma:
  ↓
  Valida cada entrada
  ↓
  Agrega a la base de datos
  ↓
  Muestra resultado (éxito/errores)
```

## 📸 Flujo de Foto de Fondo

### 1. **Seleccionar foto**

```
Usuario toca "Choose Photo"
↓
Image picker abre galería
↓
Usuario selecciona imagen
↓
App pide permiso de galería si es necesario
```

### 2. **Procesar foto**

```
Usuario edita (cropea)
↓
App comprime a 80% calidad
↓
Guarda URI en storage
```

### 3. **Aplicar fondo**

```
Se guarda en appSettings.backgroundPhotoUri
↓
ThemeContext actualiza
↓
Fondo aparece en toda la app
↓
Se aplica blur según themeStyle
```

## 📊 Formato de Importación Soportado

### Feeds (Alimentaciones)

```json
{
  "feeds": [
    {
      "id": "1775935218661",
      "dateISO": "2026-04-11T19:20:01.000Z",
      "amountMl": 180,
      "source": "bottle",
      "durationSec": 1,
      "bottleStartISO": "2026-04-11T19:20:00.000Z",
      "bottleEndISO": "2026-04-11T19:20:01.000Z"
    }
  ]
}
```

### Diapers (Pañales)

```json
{
  "diapers": [
    {
      "id": "diaper_123",
      "dateISO": "2026-04-11T19:20:01.000Z",
      "kind": "pee",
      "notes": "Heavy"
    }
  ]
}
```

### Sleeps (Sueño)

```json
{
  "sleeps": [
    {
      "id": "sleep_123",
      "dateISO": "2026-04-11T19:20:01.000Z",
      "startISO": "2026-04-11T19:00:00.000Z",
      "endISO": "2026-04-11T19:20:00.000Z",
      "durationSec": 1200,
      "location": "crib"
    }
  ]
}
```

## 🎨 Integración en Settings

La pantalla `/settings-theme` ahora incluye:

```tsx
// 1. Selector de foto de fondo
<BackgroundPhotoSelector
  currentPhotoUri={backgroundPhotoUri}
  onPhotoSelected={handlePhotoSelected}
  onPhotoRemoved={handlePhotoRemoved}
  isLoading={uploadingPhoto}
/>

// 2. Importador de datos
<DataImporter
  onImportComplete={(count) => {
    Alert.alert('Import Complete', `${count} entries imported`);
  }}
/>
```

## 🔐 Validación & Seguridad

### Importación

- ✓ Valida estructura JSON
- ✓ Verifica campos requeridos
- ✓ Convierte tipos de datos
- ✓ Genera IDs si faltan
- ✓ Maneja errores individualmente

### Foto

- ✓ Pide permisos de galería
- ✓ Valida formato de imagen
- ✓ Comprime para performancia
- ✓ Soporta edición (crop)
- ✓ Guarda en almacenamiento local

## 📝 Uso desde Código

### Importar datos programáticamente

```tsx
import { importJsonData, batchImportEntries } from "@/lib/importExport";
import { useAppData } from "@/context/AppDataContext";

function MyComponent() {
  const { addEntry } = useAppData();

  const handleImport = async (jsonString: string) => {
    try {
      const data = parseImportData(jsonString);
      const entries = importJsonData(data);
      const result = await batchImportEntries(entries, addEntry);
      console.log(`Imported ${result.success} entries`);
    } catch (error) {
      console.error(error);
    }
  };
}
```

### Exportar datos

```tsx
import { exportEntriesToJson } from "@/lib/importExport";

function ExportButton() {
  const handleExport = () => {
    const entries = [
      /* ... */
    ];
    exportEntriesToJson(entries, "my-baby-data.json");
  };

  return <Button label="Export" onPress={handleExport} />;
}
```

## 🎁 Estados & Feedback Visual

### Importador

- **Idle**: Botón listo para seleccionar archivo
- **Selecting**: Archivo picker abierto
- **Preview**: Mostrando datos a importar
- **Importing**: Procesando importación
- **Success**: Mensaje de éxito

### Photo Selector

- **No Photo**: Interfaz con botón para subir
- **Preview**: Foto visible con opciones
- **Uploading**: Indicador de carga
- **Success**: Confirmación y badge

## ⚠️ Consideraciones Importantes

1. **Permisos**: La app pide permiso de galería al seleccionar foto
2. **Almacenamiento**: Las fotos se guardan en storage local
3. **Calidad**: Fotos se comprimen a 80% para performancia
4. **Validación**: Datos inválidos se muestran en preview
5. **Atomicidad**: Si falla una entrada, el resto continúa

## 🚀 Roadmap Futuro (Opcional)

- [ ] Importar desde URL
- [ ] Exportar datos desde settings
- [ ] Seleccionar múltiples fotos
- [ ] Efectos de foto (sepia, BW, etc.)
- [ ] Backup automático
- [ ] Sincronizar importaciones cloud
