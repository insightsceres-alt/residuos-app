# 🐳 Instalación de Docker Desktop

## ✅ Checklist de Instalación

- [ ] **Descargar instalador**: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
- [ ] **Ejecutar como administrador** (click derecho → "Ejecutar como administrador")
- [ ] **Seleccionar opciones**:
  - ✅ Use WSL 2 instead of Hyper-V
  - ✅ Add shortcut to desktop
- [ ] **Esperar instalación** (~5 minutos)
- [ ] **Reiniciar PC** (obligatorio)
- [ ] **Abrir Docker Desktop** después del reinicio
- [ ] **Aceptar términos** y Skip login
- [ ] **Verificar** que funciona

## 🧪 Verificación Post-Instalación

Abre PowerShell y ejecuta:

```powershell
docker --version
# Debería mostrar: Docker version 25.x.x

docker compose version
# Debería mostrar: Docker Compose version v2.x.x

docker run hello-world
# Debería descargar y ejecutar un contenedor de prueba
```

## 🚀 Siguiente Paso: Levantar la App

Una vez que Docker funcione:

```powershell
cd c:\Users\cmari\Desktop\AGROIA\residuos-app

# Levantar todo
docker compose --profile dev up -d

# Ver logs
docker compose logs -f

# Acceder a:
# Frontend: http://localhost:3000
# Backend: http://localhost:8002/residuos/api/docs
```

## ⚠️ Troubleshooting

### Error: "WSL 2 installation is incomplete"

```powershell
wsl --install
# Reinicia el PC
```

### Error: "Docker daemon is not running"

1. Abre "Docker Desktop" desde el menú inicio
2. Espera a que aparezca el icono verde en la bandeja del sistema
3. Vuelve a intentar

### Docker Desktop no abre

1. Desinstala Docker Desktop desde "Configuración → Aplicaciones"
2. Reinicia
3. Descarga e instala de nuevo

## 📞 Ayuda Adicional

- Documentación oficial: https://docs.docker.com/desktop/install/windows-install/
- Requisitos de sistema: Windows 11 64-bit (✅ tienes esto)
- RAM mínima: 4GB (recomendado 8GB)
