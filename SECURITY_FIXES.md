# Security Fixes Tracker

Estado del remediación de vulnerabilidades identificadas en el security review.

## 🔴 Critical Issues (Implementar inmediatamente)

### 1. Weak Password Validation (Client-side only)

**Severity**: HIGH  
**Status**: 🔴 TODO  
**Confidence**: 9/10

**Problem**:
- Validación de contraseña solo cliente-side
- Permite contraseñas de 6 caracteres (`password.length < 6`)
- No hay validación servidor-side
- Usuarios pueden crear contraseñas débiles como '123456'

**Files Affected**:
- `src/lib/index.tsx` (lines 46-53) - `passwordStrength` calculation
- `src/services/authService.ts` - `registerAccount()` - sin validación

**Exploitation Path**:
1. Usuario registra cuenta con contraseña '123456'
2. Atacante usa fuerza bruta o ataque de diccionario
3. No hay protección servidor-side contra contraseñas comunes

**Fix Plan**:
- [ ] Crear Cloud Function para validación servidor-side
- [ ] Requerir mínimo 12 caracteres
- [ ] Validar complejidad: números + mayúsculas + caracteres especiales
- [ ] Implementar blocklist de contraseñas comunes (rockyou, OWASP top 1000)
- [ ] Actualizar UI para mostrar requerimientos
- [ ] Validar en `registerAccount()` antes de crear usuario Firebase

**Code Example**:
```typescript
// Cloud Function: validatePassword.ts
exports.validatePassword = functions.https.onCall(async (data, context) => {
  const { password } = data;
  
  // Min length
  if (password.length < 12) throw new Error('Min 12 chars');
  
  // Complexity
  const hasNumbers = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  if (!hasNumbers || !hasUpper || !hasSpecial) {
    throw new Error('Require: uppercase, numbers, special chars');
  }
  
  // Check blocklist
  const blocklist = await getPasswordBlocklist();
  if (blocklist.includes(password.toLowerCase())) {
    throw new Error('Too common, try another');
  }
  
  return { valid: true };
});
```

---

### 2. CryptoJS with Weak AES-CBC (No Authenticated Encryption)

**Severity**: HIGH  
**Status**: 🔴 TODO  
**Confidence**: 9/10

**Problem**:
- CryptoJS es librería deprecada
- AES-CBC sin autenticación (no GCM)
- EVP_BytesToKey débil (CryptoJS default)
- Ciphertext es maleable e inverificable
- Contraseña encriptada + salt almacenados localmente = ataque offline

**Files Affected**:
- `src/utils/crypto.ts` - `encryptWithPin()`, `decryptWithPin()`
- `src/services/userProfileService.ts` - usa `encryptWithPin()`
- `src/lib/storage.ts` - almacena `encryptedPassword`

**Current Code**:
```typescript
export function encryptWithPin(value: string, pin: string, salt: string) {
  const key = deriveKey(pin, salt); // PBKDF2-SHA256 120k iterations ✓
  return CryptoJS.AES.encrypt(value, key).toString(); // CBC, no auth ✗
}
```

**Exploitation Path**:
1. Atacante obtiene `encryptedPassword` + `salt` + `pinHash` de AsyncStorage
2. Intenta PIN débil ('0000', '000000')
3. Genera clave con PBKDF2
4. Desencripta contraseña sin verificación de autenticación
5. Accede a Firebase Auth con contraseña real

**Fix Plan**:
- [ ] Reemplazar CryptoJS → `tweetnacl-js` o `libsodium.js`
- [ ] Usar secretbox (XSalsa20-Poly1305) para authenticated encryption
- [ ] Generar nonce aleatorio por encriptación
- [ ] Incluir nonce en ciphertext
- [ ] Migrar datos existentes encriptados (opcional en v1.1)
- [ ] Actualizar tests

**Code Example - Opción 1: TweetNaCl**:
```typescript
import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export function encryptWithPin(value: string, pin: string, salt: string): string {
  const key = deriveKeySecure(pin, salt); // Key derivation (same PBKDF2)
  const nonce = nacl.randomBytes(24);
  const ciphertext = nacl.secretbox(encodeUTF8(value), nonce, key);
  
  // Encode: nonce + ciphertext as base64
  const combined = Buffer.concat([nonce, ciphertext]);
  return combined.toString('base64');
}

export function decryptWithPin(encrypted: string, pin: string, salt: string): string {
  const key = deriveKeySecure(pin, salt);
  const combined = Buffer.from(encrypted, 'base64');
  
  const nonce = combined.slice(0, 24);
  const ciphertext = combined.slice(24);
  
  const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
  if (!plaintext) throw new Error('Decryption failed or tampered');
  
  return decodeUTF8(plaintext);
}
```

**Code Example - Opción 2: libsodium.js**:
```typescript
import sodium from 'libsodium.js';

export function encryptWithPin(value: string, pin: string, salt: string): string {
  await sodium.ready;
  const key = deriveKeySecure(pin, salt);
  
  const ciphertext = sodium.crypto_secretbox_easy(value, sodium.randombytes_buf(24), key);
  return sodium.to_base64(ciphertext);
}
```

**Dependencies to add**:
```json
{
  "tweetnacl-js": "^1.0.3",
  "tweetnacl-util": "^0.15.1"
}
// OR
{
  "libsodium.js": "^0.7.11"
}
```

---

## 🟡 Important Issues (Próximas 2 sprints)

### 3. Password Storage Architecture (Design Issue)

**Severity**: MEDIUM  
**Status**: 🟡 DESIGN  
**Related**: Issues #1, #2

**Problem**:
- Contraseña encriptada almacenada localmente en AsyncStorage
- Aún vulnerable si device está comprometido
- PIN débil puede ser usado para derivar clave

**Better Approach**:
1. **Opción A: Biometric + Firebase Session Token** (Recomendado)
   - Eliminar "Remember Me" con contraseña
   - Usar biometría (Face ID, Touch ID)
   - Almacenar solo Firebase ID Token + Refresh Token
   - Biometría para desbloquear tokens

2. **Opción B: Passwordless (Email Link / Magic Link)**
   - Eliminar almacenamiento de contraseñas
   - Firebase Auth Email/Password provider
   - Usar Custom Tokens + backend

3. **Opción C: OAuth (Google Sign-In)**
   - Eliminación completa de gestión de contraseñas
   - Dejar Google manejar autenticación

**Implementation**:
- [ ] Diseñar flujo de biometría
- [ ] Implementar token refresh logic
- [ ] Migrar usuarios existentes (opción de cambiar a biometría)
- [ ] Deprecar "Remember Me" en v1.1

---

## 📋 Checklist de Implementación

### Phase 1: Crypto Migration (Sprint N)
- [ ] Instalar `tweetnacl-js` + `tweetnacl-util`
- [ ] Crear `src/utils/crypto-secure.ts` (nueva implementación)
- [ ] Tests unitarios para encryptWithPin/decryptWithPin
- [ ] Verificar backwards compatibility con datos existentes
- [ ] Actualizar importes en `userProfileService.ts`
- [ ] Deploy a staging y test

### Phase 2: Password Validation (Sprint N+1)
- [ ] Crear Cloud Function `validatePassword`
- [ ] Descargar OWASP Top 1000 common passwords
- [ ] Actualizar `registerAccount()` para llamar Cloud Function
- [ ] Actualizar UI en `register.tsx` con requerimientos
- [ ] Tests: contraseña débil rechazada, fuerte aceptada
- [ ] Deploy y test

### Phase 3: Authentication Architecture (Sprint N+2)
- [ ] Diseño de biometría + token refresh
- [ ] Implementar `useAuthWithBiometrics`
- [ ] Actualizar `AuthContext.tsx`
- [ ] Tests end-to-end
- [ ] Migration strategy para usuarios existentes

---

## 🔍 Testing Checklist

### Unit Tests
- [ ] `crypto-secure.ts`: encriptación/desencriptación correcta
- [ ] `crypto-secure.ts`: tampering detection (modificar ciphertext debe fallar)
- [ ] `validatePassword()`: acepta contraseñas fuertes, rechaza débiles
- [ ] `validatePassword()`: rechaza contraseñas en blocklist

### Integration Tests
- [ ] Registro con contraseña fuerte → OK
- [ ] Registro con contraseña débil → Error
- [ ] Encriptar + desencriptar flujo completo → datos intactos
- [ ] Biometría desbloqueando tokens → acceso restaurado

### Manual Testing
- [ ] Test en iOS device (Keychain interaction)
- [ ] Test en Android device (EncryptedSharedPreferences)
- [ ] Test en web (no biometría disponible)
- [ ] Migration de usuarios antiguos sin regresiones

---

## 📊 Riesgo Residual

**Después de implementar los fixes**:
- Contraseña débil: `MITIGADO ✓`
- Crypto débil: `MITIGADO ✓`
- Almacenamiento local de contraseña: `REDUCIDO` (aún en AsyncStorage, pero con mejor crypto)

**Para eliminar completamente el riesgo residual**:
- Implementar biometría + token-only (no contraseña local)
- Esta es la solución a largo plazo

---

## 📝 Notas

- **Backwards Compatibility**: Las contraseñas antiguas encriptadas con CryptoJS necesitarán re-encriptación. Plan: pedir al usuario que cambie contraseña en próximo login (trigger migration).
- **Dependencies**: Considerar size impact de tweetnacl/libsodium en bundle Expo
- **Firebase Rules**: Verificar que Firestore Security Rules validan `uid` en todos los subcollection reads/writes
- **Audit Logging**: Considerar agregar logging de intentos de login fallidos (para detección de brute force)

---

## Referencias

- [OWASP Password Requirements](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#password-authentication)
- [TweetNaCl.js Docs](https://tweetnacl.js.org/)
- [Firebase Auth Best Practices](https://firebase.google.com/docs/auth/best-practices)
- [Expo SecureStore API](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [CryptoJS Deprecation Notice](https://github.com/brix/crypto-js/issues/455)
