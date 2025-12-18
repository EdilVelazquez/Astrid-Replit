/*
  # Agregar marcas y modelos de vehículos comerciales

  1. Nuevas Marcas
    - Kenworth
    - Freightliner
    - International
    - Volvo Trucks
    - Scania
    - MAN
    - Hino
    - Peterbilt
    - Mack
    - Western Star
    - DAF

  2. Nuevos Modelos
    - Modelos comerciales para marcas existentes (Ford, Chevrolet, Nissan, etc.)
    - Modelos específicos de tractocamiones y camiones de carga
    - Modelos de vehículos comerciales ligeros, medianos y pesados
*/

-- Insertar marcas comerciales nuevas
INSERT INTO vehicle_brands (name) VALUES
  ('KENWORTH'),
  ('FREIGHTLINER'),
  ('INTERNATIONAL'),
  ('VOLVO TRUCKS'),
  ('SCANIA'),
  ('MAN'),
  ('HINO'),
  ('PETERBILT'),
  ('MACK'),
  ('WESTERN STAR'),
  ('DAF')
ON CONFLICT (name) DO NOTHING;

-- Agregar modelos comerciales para Ford
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('TRANSIT'),
  ('TRANSIT CONNECT'),
  ('E-SERIES'),
  ('F-250'),
  ('F-350'),
  ('F-450'),
  ('F-550'),
  ('F-650'),
  ('F-750')
) AS models(modelo)
WHERE vehicle_brands.name = 'FORD'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos comerciales para Chevrolet
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('EXPRESS'),
  ('EXPRESS CARGO'),
  ('SILVERADO 2500'),
  ('SILVERADO 3500'),
  ('LOW CAB FORWARD'),
  ('LCF'),
  ('KODIAK')
) AS models(modelo)
WHERE vehicle_brands.name = 'CHEVROLET'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos comerciales para Nissan
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('URVAN'),
  ('NV200'),
  ('NV1500'),
  ('NV2500'),
  ('NV3500'),
  ('CABSTAR')
) AS models(modelo)
WHERE vehicle_brands.name = 'NISSAN'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos comerciales para Volkswagen
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('CADDY'),
  ('CADDY CARGO'),
  ('CRAFTER'),
  ('TRANSPORTER')
) AS models(modelo)
WHERE vehicle_brands.name = 'VOLKSWAGEN'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos comerciales para Toyota
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('HIACE'),
  ('HIACE CARGO'),
  ('DYNA'),
  ('COASTER')
) AS models(modelo)
WHERE vehicle_brands.name = 'TOYOTA'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos para Mercedes-Benz (comerciales)
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('SPRINTER'),
  ('SPRINTER CARGO'),
  ('METRIS'),
  ('VITO'),
  ('ACTROS'),
  ('ATEGO'),
  ('AXOR'),
  ('ACCELO')
) AS models(modelo)
WHERE vehicle_brands.name = 'MERCEDES-BENZ'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos para Isuzu (comerciales)
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('NKR'),
  ('NLR'),
  ('NMR'),
  ('NPR'),
  ('NQR'),
  ('NRR'),
  ('NSR'),
  ('FRR'),
  ('FSR'),
  ('FTR'),
  ('FVR'),
  ('FVZ'),
  ('ELF'),
  ('FORWARD'),
  ('GIGA')
) AS models(modelo)
WHERE vehicle_brands.name = 'ISUZU'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Kenworth
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('T680'),
  ('T800'),
  ('W900'),
  ('T880'),
  ('T270'),
  ('T370'),
  ('T440'),
  ('T470'),
  ('C500')
) AS models(modelo)
WHERE vehicle_brands.name = 'KENWORTH'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Freightliner
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('CASCADIA'),
  ('M2 106'),
  ('M2 112'),
  ('114SD'),
  ('122SD'),
  ('COLUMBIA'),
  ('CORONADO'),
  ('BUSINESS CLASS'),
  ('CENTURY CLASS'),
  ('ARGOSY')
) AS models(modelo)
WHERE vehicle_brands.name = 'FREIGHTLINER'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para International
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('PROSTAR'),
  ('LONESTAR'),
  ('WORKSTAR'),
  ('DURASTAR'),
  ('TERRASTAR'),
  ('LT'),
  ('RH'),
  ('MV'),
  ('CV')
) AS models(modelo)
WHERE vehicle_brands.name = 'INTERNATIONAL'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Volvo Trucks
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('VNL'),
  ('VNL 760'),
  ('VNL 860'),
  ('VNR'),
  ('VHD'),
  ('VAH'),
  ('FE'),
  ('FL'),
  ('FM'),
  ('FH'),
  ('FMX')
) AS models(modelo)
WHERE vehicle_brands.name = 'VOLVO TRUCKS'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Scania
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('SERIE R'),
  ('SERIE S'),
  ('SERIE P'),
  ('SERIE G'),
  ('R 450'),
  ('R 500'),
  ('R 540'),
  ('R 620'),
  ('S 500'),
  ('S 580'),
  ('P 320'),
  ('P 360'),
  ('P 410'),
  ('G 360'),
  ('G 410'),
  ('G 440')
) AS models(modelo)
WHERE vehicle_brands.name = 'SCANIA'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para MAN
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('TGL'),
  ('TGM'),
  ('TGS'),
  ('TGX'),
  ('TGE'),
  ('CLA')
) AS models(modelo)
WHERE vehicle_brands.name = 'MAN'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Hino
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('SERIE 155'),
  ('SERIE 195'),
  ('SERIE 268'),
  ('SERIE 300'),
  ('SERIE 338'),
  ('SERIE 358'),
  ('SERIE 500'),
  ('SERIE 700'),
  ('DUTRO'),
  ('RANGER'),
  ('PROFIA')
) AS models(modelo)
WHERE vehicle_brands.name = 'HINO'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Peterbilt
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('579'),
  ('567'),
  ('389'),
  ('367'),
  ('220'),
  ('325'),
  ('337'),
  ('348'),
  ('365'),
  ('520')
) AS models(modelo)
WHERE vehicle_brands.name = 'PETERBILT'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Mack
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('ANTHEM'),
  ('GRANITE'),
  ('PINNACLE'),
  ('LR'),
  ('MD'),
  ('TRIDENT'),
  ('TITAN')
) AS models(modelo)
WHERE vehicle_brands.name = 'MACK'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para Western Star
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('4700'),
  ('4800'),
  ('4900'),
  ('5700'),
  ('6900')
) AS models(modelo)
WHERE vehicle_brands.name = 'WESTERN STAR'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Modelos para DAF
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('XF'),
  ('XG'),
  ('XG+'),
  ('CF'),
  ('LF'),
  ('XD'),
  ('XB')
) AS models(modelo)
WHERE vehicle_brands.name = 'DAF'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos para GMC (comerciales)
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('SAVANA'),
  ('SAVANA CARGO'),
  ('SIERRA 2500'),
  ('SIERRA 3500'),
  ('TOPKICK'),
  ('W-SERIES')
) AS models(modelo)
WHERE vehicle_brands.name = 'GMC'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos para Dodge (comerciales)
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('PROMASTER'),
  ('PROMASTER CITY'),
  ('PROMASTER CARGO')
) AS models(modelo)
WHERE vehicle_brands.name = 'DODGE'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Agregar modelos para Ram
INSERT INTO vehicle_models (brand_id, name)
SELECT id, modelo FROM vehicle_brands, (VALUES
  ('1500'),
  ('2500'),
  ('3500'),
  ('4500'),
  ('5500'),
  ('CHASSIS CAB'),
  ('PROMASTER'),
  ('PROMASTER CITY')
) AS models(modelo)
WHERE vehicle_brands.name = 'RAM'
ON CONFLICT (brand_id, name) DO NOTHING;
