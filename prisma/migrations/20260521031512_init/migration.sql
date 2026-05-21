-- CreateTable
CREATE TABLE `ct_categoria` (
    `id_ct_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_categoria_nombre_key`(`nombre`),
    INDEX `FK_ct_categoria_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_categoria_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `ct_categoria_estado_idx`(`estado`),
    PRIMARY KEY (`id_ct_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_cliente` (
    `id_ct_cliente` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(255) NOT NULL,
    `telefono` VARCHAR(20) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_ct_cliente_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_cliente_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_ct_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_estado_reservacion` (
    `id_ct_estado_reservacion` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `implica_pago_activo` BOOLEAN NOT NULL DEFAULT false,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `ct_estado_reservacion_clave_key`(`clave`),
    INDEX `ct_estado_reservacion_clave_idx`(`clave`),
    INDEX `ct_estado_reservacion_estado_idx`(`estado`),
    PRIMARY KEY (`id_ct_estado_reservacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_mesa` (
    `id_ct_mesa` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(50) NOT NULL,
    `capacidad` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'libre',
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_mesa_codigo_key`(`codigo`),
    INDEX `FK_ct_mesa_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_mesa_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `ct_mesa_estado_idx`(`estado`),
    PRIMARY KEY (`id_ct_mesa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_permiso` (
    `id_ct_permiso` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `codigo` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_permiso_nombre_key`(`nombre`),
    UNIQUE INDEX `ct_permiso_codigo_key`(`codigo`),
    INDEX `FK_ct_permiso_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_permiso_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_ct_permiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_plantilla_correo` (
    `id_ct_plantilla_correo` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `asunto` VARCHAR(200) NOT NULL,
    `contenido_html` MEDIUMTEXT NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_plantilla_correo_clave_key`(`clave`),
    INDEX `FK_ct_plantilla_correo_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_plantilla_correo_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_ct_plantilla_correo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_platillo` (
    `id_ct_platillo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ct_categoria` INTEGER NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `imagen_url` VARCHAR(500) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_ct_platillo_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_platillo_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `ct_platillo_estado_idx`(`estado`),
    INDEX `ct_platillo_id_ct_categoria_estado_idx`(`id_ct_categoria`, `estado`),
    PRIMARY KEY (`id_ct_platillo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_rol` (
    `id_ct_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_rol_nombre_key`(`nombre`),
    INDEX `FK_ct_rol_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_rol_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_ct_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_tipo_documento` (
    `id_ct_tipo_documento` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(50) NOT NULL DEFAULT '',
    `descripcion` VARCHAR(255) NOT NULL DEFAULT '',
    `max_size_bytes` INTEGER NOT NULL,
    `extensiones_permitidas` VARCHAR(255) NOT NULL DEFAULT 'pdf,jpg,png',
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `clave`(`clave`),
    INDEX `ct_usuario_in`(`id_ct_usuario_reg`),
    INDEX `ct_usuario_up`(`id_ct_usuario_mod`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_ct_tipo_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_usuario` (
    `id_ct_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario` VARCHAR(100) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `nombre_completo` VARCHAR(200) NOT NULL,
    `id_ct_rol` INTEGER NOT NULL DEFAULT 1,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `ct_usuario_usuario_key`(`usuario`),
    UNIQUE INDEX `ct_usuario_email_key`(`email`),
    INDEX `FK_ct_usuario_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_ct_usuario_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `ct_usuario_estado_idx`(`estado`),
    INDEX `ct_usuario_id_ct_rol_fkey`(`id_ct_rol`),
    PRIMARY KEY (`id_ct_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dt_bitacora` (
    `id_dt_bitacora` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ct_usuario` INTEGER NULL,
    `accion` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `registro_id` VARCHAR(191) NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `metodo` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `datos_anteriores` LONGTEXT NULL,
    `datos_nuevos` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dt_bitacora_createdAt_idx`(`createdAt`),
    INDEX `dt_bitacora_id_ct_usuario_idx`(`id_ct_usuario`),
    INDEX `dt_bitacora_modelo_registro_id_idx`(`modelo`, `registro_id`),
    PRIMARY KEY (`id_dt_bitacora`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dt_bloqueo_seguridad` (
    `id_dt_bloqueo` INTEGER NOT NULL AUTO_INCREMENT,
    `ip_address` VARCHAR(50) NOT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `usuario_intentado` VARCHAR(100) NULL,
    `limite_alcanzado` INTEGER NOT NULL,
    `user_agent` TEXT NULL,
    `fecha_bloqueo` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `dt_bloqueo_seguridad_fecha_bloqueo_idx`(`fecha_bloqueo`),
    INDEX `dt_bloqueo_seguridad_ip_address_idx`(`ip_address`),
    PRIMARY KEY (`id_dt_bloqueo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dt_detalle_orden` (
    `id_dt_detalle_orden` INTEGER NOT NULL AUTO_INCREMENT,
    `id_rl_orden` INTEGER NOT NULL,
    `id_ct_platillo` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_dt_detalle_orden_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_dt_detalle_orden_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `dt_detalle_orden_id_ct_platillo_fkey`(`id_ct_platillo`),
    INDEX `dt_detalle_orden_id_orden_fkey`(`id_rl_orden`),
    INDEX `estado`(`estado`),
    PRIMARY KEY (`id_dt_detalle_orden`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dt_documento` (
    `id_dt_documento` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_original` VARCHAR(255) NOT NULL,
    `nombre_sistema` VARCHAR(255) NOT NULL,
    `ruta_relativa` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `tamaño_bytes` INTEGER NOT NULL,
    `hash` VARCHAR(64) NOT NULL,
    `id_ct_tipo_documento` INTEGER NOT NULL,
    `modulo` VARCHAR(100) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `estado`(`estado`),
    INDEX `id_ct_usuario_in`(`id_ct_usuario_reg`),
    INDEX `id_ct_usuario_up`(`id_ct_usuario_mod`),
    INDEX `idx_hash`(`hash`),
    INDEX `idx_id_ct_tipo_documento`(`id_ct_tipo_documento`),
    PRIMARY KEY (`id_dt_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dt_refresh_token` (
    `id_dt_refresh_token` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` VARCHAR(64) NOT NULL,
    `id_ct_usuario` INTEGER NOT NULL,
    `expira_en` DATETIME(6) NOT NULL,
    `revocado` BOOLEAN NOT NULL DEFAULT false,
    `revocado_en` DATETIME(0) NULL,
    `reemplazado_por` INTEGER NULL,
    `creado_en` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `token_hash`(`token_hash`),
    INDEX `dt_refresh_token_expira_en_idx`(`expira_en`),
    INDEX `dt_refresh_token_id_ct_usuario_idx`(`id_ct_usuario`),
    INDEX `dt_refresh_token_revocado_expira_en_idx`(`revocado`, `expira_en`),
    PRIMARY KEY (`id_dt_refresh_token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rl_orden` (
    `id_rl_orden` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ct_usuario` INTEGER NOT NULL,
    `id_ct_mesa` INTEGER NULL,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO', 'PAGADA', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `total` DECIMAL(10, 2) NOT NULL,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_rl_orden_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_rl_orden_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `dt_orden_estado_idx`(`estado`),
    INDEX `dt_orden_id_ct_mesa_estado_idx`(`id_ct_mesa`, `estado`),
    INDEX `dt_orden_id_ct_usuario_estado_idx`(`id_ct_usuario`, `estado`),
    PRIMARY KEY (`id_rl_orden`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rl_reservacion` (
    `id_rl_reservacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ct_cliente` INTEGER NOT NULL,
    `id_ct_mesa` INTEGER NULL,
    `fecha_reservacion` DATETIME(0) NOT NULL,
    `num_personas` INTEGER NOT NULL,
    `notas` VARCHAR(500) NULL,
    `id_ct_estado_reservacion` INTEGER NOT NULL,
    `clave_intento_pago` VARCHAR(255) NULL,
    `estado_pago_stripe` VARCHAR(50) NULL,
    `monto_deposito_centavos` INTEGER NULL,
    `horas_gracia_cancelacion` INTEGER NOT NULL DEFAULT 24,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    UNIQUE INDEX `rl_reservacion_clave_intento_pago_key`(`clave_intento_pago`),
    INDEX `FK_rl_reservacion_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_rl_reservacion_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `idx_reservacion_fecha_estado`(`fecha_reservacion`, `id_ct_estado_reservacion`),
    INDEX `dt_reservacion_id_ct_mesa_fkey`(`id_ct_mesa`),
    INDEX `dt_reservacion_id_ct_usuario_fkey`(`id_ct_cliente`),
    INDEX `idx_reservacion_intento_pago`(`clave_intento_pago`),
    PRIMARY KEY (`id_rl_reservacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rl_rol_permiso` (
    `id_rl_rol_permiso` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ct_rol` INTEGER NOT NULL,
    `id_ct_permiso` INTEGER NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_rl_rol_permiso_ct_usuario_mod`(`id_ct_usuario_mod`),
    INDEX `FK_rl_rol_permiso_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `dt_rol_permiso_id_ct_permiso_fkey`(`id_ct_permiso`),
    INDEX `estado`(`estado`),
    UNIQUE INDEX `dt_rol_permiso_id_ct_rol_id_ct_permiso_key`(`id_ct_rol`, `id_ct_permiso`),
    PRIMARY KEY (`id_rl_rol_permiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ct_configuracion` (
    `id_ct_configuracion` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_restaurante` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(500) NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` VARCHAR(255) NULL,
    `email_contacto` VARCHAR(255) NULL,
    `horario_apertura` VARCHAR(50) NULL,
    `horario_cierre` VARCHAR(50) NULL,
    `moneda` VARCHAR(10) NOT NULL DEFAULT '$',
    `impuesto_porcentaje` DECIMAL(5, 2) NOT NULL DEFAULT 0.16,
    `monto_penalizacion_centavos` INTEGER NOT NULL DEFAULT 20000,
    `horas_gracia_cancelacion` INTEGER NOT NULL DEFAULT 24,
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `FK_ct_configuracion_ct_usuario_mod`(`id_ct_usuario_mod`),
    PRIMARY KEY (`id_ct_configuracion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ct_categoria` ADD CONSTRAINT `FK_ct_categoria_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_categoria` ADD CONSTRAINT `FK_ct_categoria_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_cliente` ADD CONSTRAINT `FK_ct_cliente_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_cliente` ADD CONSTRAINT `FK_ct_cliente_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_mesa` ADD CONSTRAINT `FK_ct_mesa_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_mesa` ADD CONSTRAINT `FK_ct_mesa_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_permiso` ADD CONSTRAINT `FK_ct_permiso_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_permiso` ADD CONSTRAINT `FK_ct_permiso_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_plantilla_correo` ADD CONSTRAINT `FK_ct_plantilla_correo_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_plantilla_correo` ADD CONSTRAINT `FK_ct_plantilla_correo_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_platillo` ADD CONSTRAINT `FK_ct_platillo_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_platillo` ADD CONSTRAINT `FK_ct_platillo_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_platillo` ADD CONSTRAINT `ct_platillo_id_ct_categoria_fkey` FOREIGN KEY (`id_ct_categoria`) REFERENCES `ct_categoria`(`id_ct_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ct_rol` ADD CONSTRAINT `FK_ct_rol_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_rol` ADD CONSTRAINT `FK_ct_rol_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_tipo_documento` ADD CONSTRAINT `FK_ct_tipo_documento_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_tipo_documento` ADD CONSTRAINT `FK_ct_tipo_documento_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_usuario` ADD CONSTRAINT `FK_ct_usuario_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_usuario` ADD CONSTRAINT `FK_ct_usuario_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_usuario` ADD CONSTRAINT `ct_usuario_id_ct_rol_fkey` FOREIGN KEY (`id_ct_rol`) REFERENCES `ct_rol`(`id_ct_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dt_detalle_orden` ADD CONSTRAINT `FK_dt_detalle_orden_ct_platillo` FOREIGN KEY (`id_ct_platillo`) REFERENCES `ct_platillo`(`id_ct_platillo`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_detalle_orden` ADD CONSTRAINT `FK_dt_detalle_orden_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_detalle_orden` ADD CONSTRAINT `FK_dt_detalle_orden_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_detalle_orden` ADD CONSTRAINT `FK_dt_detalle_orden_rl_orden` FOREIGN KEY (`id_rl_orden`) REFERENCES `rl_orden`(`id_rl_orden`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_documento` ADD CONSTRAINT `FK_dt_documento_ct_tipo_documento` FOREIGN KEY (`id_ct_tipo_documento`) REFERENCES `ct_tipo_documento`(`id_ct_tipo_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_documento` ADD CONSTRAINT `FK_dt_documento_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_documento` ADD CONSTRAINT `FK_dt_documento_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dt_refresh_token` ADD CONSTRAINT `dt_refresh_token_id_ct_usuario_fkey` FOREIGN KEY (`id_ct_usuario`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rl_orden` ADD CONSTRAINT `FK_rl_orden_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_orden` ADD CONSTRAINT `FK_rl_orden_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_orden` ADD CONSTRAINT `dt_orden_id_ct_mesa_fkey` FOREIGN KEY (`id_ct_mesa`) REFERENCES `ct_mesa`(`id_ct_mesa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rl_orden` ADD CONSTRAINT `dt_orden_id_ct_usuario_fkey` FOREIGN KEY (`id_ct_usuario`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rl_reservacion` ADD CONSTRAINT `FK_rl_reservacion_ct_cliente` FOREIGN KEY (`id_ct_cliente`) REFERENCES `ct_cliente`(`id_ct_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_reservacion` ADD CONSTRAINT `FK_rl_reservacion_ct_mesa` FOREIGN KEY (`id_ct_mesa`) REFERENCES `ct_mesa`(`id_ct_mesa`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_reservacion` ADD CONSTRAINT `FK_rl_reservacion_ct_estado` FOREIGN KEY (`id_ct_estado_reservacion`) REFERENCES `ct_estado_reservacion`(`id_ct_estado_reservacion`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_reservacion` ADD CONSTRAINT `FK_rl_reservacion_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_reservacion` ADD CONSTRAINT `FK_rl_reservacion_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_rol_permiso` ADD CONSTRAINT `FK_rl_rol_permiso_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_rol_permiso` ADD CONSTRAINT `FK_rl_rol_permiso_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `rl_rol_permiso` ADD CONSTRAINT `dt_rol_permiso_id_ct_permiso_fkey` FOREIGN KEY (`id_ct_permiso`) REFERENCES `ct_permiso`(`id_ct_permiso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rl_rol_permiso` ADD CONSTRAINT `dt_rol_permiso_id_ct_rol_fkey` FOREIGN KEY (`id_ct_rol`) REFERENCES `ct_rol`(`id_ct_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ct_configuracion` ADD CONSTRAINT `FK_ct_configuracion_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;
