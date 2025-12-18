/*
  # Deprecar tabla admin_users

  1. Contexto
    - La tabla `admin_users` está obsoleta
    - Todo el sistema ahora usa `user_profiles` con campo `role`
    - `admin_users` causa confusión y errores

  2. Cambios
    - Eliminar tabla `admin_users` completamente
    - El sistema usará únicamente `user_profiles` para gestión de roles

  3. Notas Importantes
    - Los roles se gestionan en `user_profiles.role` ('owner', 'admin', 'user')
    - Las funciones RPC ya están creadas y funcionan con `user_profiles`
    - Este cambio elimina la duplicidad y simplifica el sistema
*/

-- Eliminar tabla admin_users
DROP TABLE IF EXISTS admin_users CASCADE;
