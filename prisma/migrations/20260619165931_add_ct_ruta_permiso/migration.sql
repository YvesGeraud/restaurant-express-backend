-- CreateTable
CREATE TABLE `ct_ruta_permiso` (
    `id_ct_ruta_permiso` INTEGER NOT NULL AUTO_INCREMENT,
    `metodo` VARCHAR(10) NOT NULL,
    `ruta` VARCHAR(255) NOT NULL,
    `id_ct_permiso` INTEGER NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `fecha_reg` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_mod` DATETIME(0) NULL,
    `id_ct_usuario_reg` INTEGER NOT NULL,
    `id_ct_usuario_mod` INTEGER NULL,

    INDEX `ct_ruta_permiso_estado_idx`(`estado`),
    INDEX `FK_ct_ruta_permiso_ct_permiso`(`id_ct_permiso`),
    INDEX `FK_ct_ruta_permiso_ct_usuario_reg`(`id_ct_usuario_reg`),
    INDEX `FK_ct_ruta_permiso_ct_usuario_mod`(`id_ct_usuario_mod`),
    UNIQUE INDEX `uq_ct_ruta_permiso_metodo_ruta`(`metodo`, `ruta`),
    PRIMARY KEY (`id_ct_ruta_permiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ct_ruta_permiso` ADD CONSTRAINT `FK_ct_ruta_permiso_ct_permiso` FOREIGN KEY (`id_ct_permiso`) REFERENCES `ct_permiso`(`id_ct_permiso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ct_ruta_permiso` ADD CONSTRAINT `FK_ct_ruta_permiso_ct_usuario_reg` FOREIGN KEY (`id_ct_usuario_reg`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ct_ruta_permiso` ADD CONSTRAINT `FK_ct_ruta_permiso_ct_usuario_mod` FOREIGN KEY (`id_ct_usuario_mod`) REFERENCES `ct_usuario`(`id_ct_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;
