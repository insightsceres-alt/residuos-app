"""
Script para generar datos dummy: empresas, usuarios y registros de 12 meses
Ejecutar con: python -m app.seed_data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
import random
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Empresa, Usuario, RegistroResiduo, Transportista, Vehiculo
from app.auth import get_password_hash

# Crear todas las tablas
Base.metadata.create_all(bind=engine)


def seed_database():
    """Poblar la base de datos con datos de prueba"""
    db = SessionLocal()
    
    try:
        print("🌱 Iniciando seed de datos...")
        
        # ========================================
        # CREAR EMPRESAS
        # ========================================
        print("\n📦 Creando empresas...")
        
        empresa1_id = uuid.uuid4()
        empresa2_id = uuid.uuid4()
        
        empresa1 = Empresa(
            id=empresa1_id,
            nombre="AgroVerde S.L.",
            cif="B12345678",
            direccion="Polígono Industrial Las Rozas, Nave 12",
            provincia="Madrid",
            municipio="Las Rozas",
            telefono="912345678",
            email="contacto@agroverde.com",
            sector="Agroalimentario",
            activo=True
        )
        
        empresa2 = Empresa(
            id=empresa2_id,
            nombre="EcoRecicla Industrial S.A.",
            cif="A87654321",
            direccion="Calle Industria 45, Polígono Norte",
            provincia="Barcelona",
            municipio="Sabadell",
            telefono="934567890",
            email="info@ecorecicla.com",
            sector="Industrial",
            activo=True
        )
        
        # Verificar si ya existen
        existing1 = db.query(Empresa).filter(Empresa.cif == "B12345678").first()
        existing2 = db.query(Empresa).filter(Empresa.cif == "A87654321").first()
        
        if not existing1:
            db.add(empresa1)
            print(f"  ✅ Empresa creada: {empresa1.nombre}")
        else:
            empresa1_id = existing1.id
            print(f"  ⏭️  Empresa ya existe: {existing1.nombre}")
            
        if not existing2:
            db.add(empresa2)
            print(f"  ✅ Empresa creada: {empresa2.nombre}")
        else:
            empresa2_id = existing2.id
            print(f"  ⏭️  Empresa ya existe: {existing2.nombre}")
        
        db.commit()
        
        # ========================================
        # CREAR USUARIOS
        # ========================================
        print("\n👤 Creando usuarios...")
        
        usuarios_data = [
            {
                "email": "usuario@agroverde.com",
                "password": "agroverde123",
                "nombre": "Carlos",
                "apellidos": "García López",
                "empresa_id": empresa1_id,
                "rol": "admin"
            },
            {
                "email": "operador@agroverde.com",
                "password": "agroverde123",
                "nombre": "María",
                "apellidos": "Fernández Ruiz",
                "empresa_id": empresa1_id,
                "rol": "operador"
            },
            {
                "email": "usuario@ecorecicla.com",
                "password": "ecorecicla123",
                "nombre": "Pedro",
                "apellidos": "Martínez Sánchez",
                "empresa_id": empresa2_id,
                "rol": "admin"
            },
            {
                "email": "operador@ecorecicla.com",
                "password": "ecorecicla123",
                "nombre": "Ana",
                "apellidos": "López Díaz",
                "empresa_id": empresa2_id,
                "rol": "operador"
            }
        ]
        
        for user_data in usuarios_data:
            existing_user = db.query(Usuario).filter(Usuario.email == user_data["email"]).first()
            if not existing_user:
                usuario = Usuario(
                    id=uuid.uuid4(),
                    email=user_data["email"],
                    password_hash=get_password_hash(user_data["password"]),
                    nombre=user_data["nombre"],
                    apellidos=user_data["apellidos"],
                    empresa_id=user_data["empresa_id"],
                    rol=user_data["rol"],
                    activo=True
                )
                db.add(usuario)
                print(f"  ✅ Usuario creado: {user_data['email']} (pwd: {user_data['password']})")
            else:
                print(f"  ⏭️  Usuario ya existe: {user_data['email']}")
        
        db.commit()
        
        # ========================================
        # CREAR TRANSPORTISTAS
        # ========================================
        print("\n🚛 Creando transportistas...")
        
        transportistas_data = [
            ("T001", "Transportes García SL", "B11111111"),
            ("T002", "Logística Verde SA", "A22222222"),
            ("T003", "TransEco Express", "B33333333"),
        ]
        
        for t_id, nombre, cif in transportistas_data:
            existing = db.query(Transportista).filter(Transportista.id == t_id).first()
            if not existing:
                trans = Transportista(
                    id=t_id,
                    nombre_empresa=nombre,
                    cif=cif,
                    telefono="900000000",
                    email=f"contacto@{t_id.lower()}.com",
                    activo=True
                )
                db.add(trans)
                print(f"  ✅ Transportista creado: {nombre}")
            else:
                print(f"  ⏭️  Transportista ya existe: {nombre}")
        
        db.commit()
        
        # ========================================
        # CREAR VEHÍCULOS
        # ========================================
        print("\n🚚 Creando vehículos...")
        
        vehiculos_data = [
            ("1234ABC", "T001", "Camión", 15000),
            ("5678DEF", "T001", "Furgoneta", 3500),
            ("9012GHI", "T002", "Camión", 20000),
            ("3456JKL", "T003", "Trailer", 25000),
        ]
        
        for matricula, trans_id, tipo, capacidad in vehiculos_data:
            existing = db.query(Vehiculo).filter(Vehiculo.matricula == matricula).first()
            if not existing:
                vehiculo = Vehiculo(
                    matricula=matricula,
                    transportista_id=trans_id,
                    tipo=tipo,
                    capacidad_kg=capacidad,
                    marca="Mercedes",
                    modelo="Actros",
                    activo=True
                )
                db.add(vehiculo)
                print(f"  ✅ Vehículo creado: {matricula}")
            else:
                print(f"  ⏭️  Vehículo ya existe: {matricula}")
        
        db.commit()
        
        # ========================================
        # GENERAR REGISTROS DE 12 MESES
        # ========================================
        print("\n📊 Generando registros de 12 meses...")
        
        # Tipologías con sus códigos LER (formato 6 dígitos sin espacios)
        tipologias = [
            # Grupo 02 - Residuos agricultura
            ("Lodos de lavado y limpieza", "020101"),
            ("Residuos de tejidos de vegetales", "020103"),
            ("Residuos de plásticos agrícolas", "020104"),
            ("Heces de animales, orina y estiércol", "020106"),
            ("Residuos de la silvicultura", "020107"),
            ("Residuos agroquímicos peligrosos", "020108"),
            ("Residuos agroquímicos no peligrosos", "020109"),
            ("Residuos metálicos agrícolas", "020110"),
            # Grupo 03 - Residuos madera
            ("Residuos de corteza y corcho", "030101"),
            ("Serrín y virutas de madera", "030105"),
            # Grupo 13 - Aceites
            ("Aceites minerales de motor no clorados", "130205"),
            ("Aceites sintéticos de motor", "130206"),
            ("Otros aceites de motor y transmisión", "130208"),
            # Grupo 15 - Envases
            ("Envases de papel y cartón", "150101"),
            ("Envases de plástico", "150102"),
            ("Envases de madera", "150103"),
            ("Envases metálicos", "150104"),
            ("Envases de vidrio", "150107"),
            ("Envases con residuos peligrosos", "150110"),
            # Grupo 16 - Residuos no especificados
            ("Baterías de plomo", "160601"),
            ("Neumáticos fuera de uso", "160103"),
            # Grupo 17 - Construcción y demolición
            ("Mezclas de hormigón, ladrillos", "170107"),
            ("Madera de construcción", "170201"),
            ("Vidrio de construcción", "170202"),
            ("Plástico de construcción", "170203"),
            ("Hierro y acero de construcción", "170405"),
            # Grupo 20 - Residuos municipales
            ("Papel y cartón municipal", "200101"),
            ("Vidrio municipal", "200102"),
            ("Residuos biodegradables", "200201"),
            ("Aceites y grasas comestibles", "200125"),
        ]
        
        estados = ['PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO']
        conductores = ["Juan Pérez", "Antonio García", "Miguel López", "Francisco Ruiz"]
        
        # Ubicaciones por empresa
        ubicaciones_empresa1 = [
            ("Nave de producción principal", "Madrid", "Las Rozas", 40.4893, -3.8765),
            ("Almacén central", "Madrid", "Majadahonda", 40.4731, -3.8722),
            ("Campo de cultivo Norte", "Madrid", "Torrelodones", 40.5764, -3.9321),
        ]
        
        ubicaciones_empresa2 = [
            ("Planta de procesado", "Barcelona", "Sabadell", 41.5463, 2.1086),
            ("Centro logístico", "Barcelona", "Terrassa", 41.5629, 2.0089),
            ("Zona industrial Sur", "Barcelona", "Martorell", 41.4736, 1.9306),
        ]
        
        # Generar registros para cada empresa
        empresas_config = [
            (empresa1_id, "AgroVerde", ubicaciones_empresa1, 15, 25),  # 15-25 registros por mes
            (empresa2_id, "EcoRecicla", ubicaciones_empresa2, 20, 35),  # 20-35 registros por mes
        ]
        
        total_registros = 0
        
        for emp_id, emp_nombre, ubicaciones, min_reg, max_reg in empresas_config:
            print(f"\n  📦 Generando para {emp_nombre}...")
            
            # 12 meses hacia atrás
            for mes_offset in range(12, 0, -1):
                fecha_base = datetime.now() - timedelta(days=mes_offset * 30)
                num_registros = random.randint(min_reg, max_reg)
                
                for _ in range(num_registros):
                    # Fecha aleatoria dentro del mes
                    dia_offset = random.randint(0, 28)
                    fecha_registro = fecha_base + timedelta(days=dia_offset)
                    
                    # Seleccionar datos aleatorios
                    tipologia, codigo_ler = random.choice(tipologias)
                    ubicacion = random.choice(ubicaciones)
                    estado = random.choice(estados)
                    
                    # Peso variable según tipología
                    if "orgánico" in tipologia.lower():
                        peso = random.uniform(500, 3000)
                    elif "aceite" in tipologia.lower():
                        peso = random.uniform(50, 500)
                    else:
                        peso = random.uniform(100, 2000)
                    
                    registro = RegistroResiduo(
                        id=uuid.uuid4(),
                        empresa_id=emp_id,
                        fecha_registro=fecha_registro,
                        tipologia=tipologia,
                        codigo_ler=codigo_ler,
                        peso_kg=round(peso, 2),
                        lugar_recogida=ubicacion[0],
                        provincia=ubicacion[1],
                        municipio=ubicacion[2],
                        latitud=ubicacion[3],
                        longitud=ubicacion[4],
                        transportista_id=random.choice(["T001", "T002", "T003"]),
                        vehiculo_matricula=random.choice(["1234ABC", "5678DEF", "9012GHI", "3456JKL"]),
                        conductor_nombre=random.choice(conductores),
                        estado=estado,
                        enviado_esir=random.random() > 0.7,  # 30% enviados al ESIR
                        fecha_envio_esir=fecha_registro + timedelta(days=1) if random.random() > 0.7 else None,
                        usuario_creacion="seed_script",
                        origen=ubicacion[0],
                        destino="Planta de tratamiento central",
                        planta_tratamiento="Planta de Reciclaje Centro"
                    )
                    db.add(registro)
                    total_registros += 1
                
                # Commit por mes para evitar transacciones muy grandes
                db.commit()
            
            print(f"    ✅ Registros generados para {emp_nombre}")
        
        print(f"\n🎉 Seed completado!")
        print(f"   Total registros creados: {total_registros}")
        print("\n" + "="*60)
        print("📋 CREDENCIALES DE ACCESO:")
        print("="*60)
        print("\n🏭 AgroVerde S.L.:")
        print("   Email: usuario@agroverde.com")
        print("   Password: agroverde123")
        print("\n🏭 EcoRecicla Industrial S.A.:")
        print("   Email: usuario@ecorecicla.com")
        print("   Password: ecorecicla123")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
