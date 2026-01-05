import { useState, useEffect, useRef } from 'react';
import { ExpedienteServicio } from '../types';
import { guardarPrefolioDatos, guardarPrefolioFotos } from '../services/prefolioService';
import { buscarEquipoEnInventario } from '../services/zohoInventoryService';
import { notificarInicioTrabajo, notificarCreacionAsset, notificarEdicionAsset } from '../services/serviceTransitionService';
import { supabase } from '../supabaseClient';
import { CheckCircle, Loader2, AlertCircle, Camera, FileImage, QrCode, X, MapPin, Calendar, User, Building, Truck, Server } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { VinScannerWithPhoto } from './VinScannerWithPhoto';
import { PlacaScannerWithPhoto } from './PlacaScannerWithPhoto';
import { traducirPruebasDesdeInstallationDetails, formatearFecha } from '../utils';

interface PrefolioFormProps {
  expediente: ExpedienteServicio;
  onCompleted: () => void;
  onClose?: () => void;
}

interface VehicleBrand {
  id: number;
  name: string;
}

interface VehicleModel {
  id: number;
  brand_id: number;
  name: string;
}

export function PrefolioForm({ expediente, onCompleted, onClose: _onClose }: PrefolioFormProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>('');

  const [marcaId, setMarcaId] = useState<string>('');
  const [modeloId, setModeloId] = useState<string>('');
  const [vin, setVin] = useState(expediente.asset_vin || '');
  const [vinManualEnabled, setVinManualEnabled] = useState(false);
  const [odometro, setOdometro] = useState(
    expediente.vehicle_odometer?.toString() || ''
  );
  const [placas, setPlacas] = useState(expediente.asset_placas || '');
  const [color, setColor] = useState(expediente.asset_color || '');
  const [numeroEconomico, setNumeroEconomico] = useState(
    expediente.asset_economico || ''
  );
  const [año, setAño] = useState(expediente.vehicle_year || '');
  const [modeloDispositivo, setModeloDispositivo] = useState(
    expediente.prefolio_modelo_dispositivo || ''
  );
  const [esn, setEsn] = useState(expediente.device_esn || '');
  const [imei, setImei] = useState(expediente.prefolio_imei_dispositivo || '');
  const [telefonoSim, setTelefonoSim] = useState(
    expediente.prefolio_telefono_sim || ''
  );
  const [zohoInventoryId, setZohoInventoryId] = useState<string>('');
  const [capturaManualEnabled, setCapturaManualEnabled] = useState(false);
  const [buscandoEquipo, setBuscandoEquipo] = useState(false);
  const [equipoBuscado, setEquipoBuscado] = useState(false);
  const [equipoEncontradoEnCRM, setEquipoEncontradoEnCRM] = useState(false);
  const [esnTemporal, setEsnTemporal] = useState('');

  const [fotosVehiculo, setFotosVehiculo] = useState<File[]>([]);
  const [fotoOdometro, setFotoOdometro] = useState<File | null>(null);
  const [fotoVin, setFotoVin] = useState<File | null>(null);
  const [fotoPlacas, setFotoPlacas] = useState<File | null>(null);
  const [fotoTablero, setFotoTablero] = useState<File | null>(null);

  const [marcas, setMarcas] = useState<VehicleBrand[]>([]);
  const [modelos, setModelos] = useState<VehicleModel[]>([]);
  const [modelosFiltrados, setModelosFiltrados] = useState<VehicleModel[]>([]);
  const [mostrarQRScanner, setMostrarQRScanner] = useState(false);
  const inicializacionCompletada = useRef(false);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    setModelosFiltrados(modelos);
  }, [modelos]);

  useEffect(() => {
    const inicializarMarcaYModelo = async () => {
      if (inicializacionCompletada.current) {
        console.log('⏭️ Inicialización ya completada, saltando...');
        return;
      }
      if (marcas.length === 0 || modelos.length === 0) {
        console.log('⏸️ Esperando catálogos...', { marcas: marcas.length, modelos: modelos.length });
        return;
      }

      const marcaNombre = expediente.asset_marca;
      const modeloNombre = expediente.asset_submarca;

      console.log('🔧 Inicializando marca y modelo automáticamente...');
      console.log(`📋 Marca: ${marcaNombre}`);
      console.log(`📋 Modelo: ${modeloNombre}`);
      console.log(`📊 Modelos disponibles: ${modelos.length}`);

      let finalMarcaId: string | null = null;

      if (marcaNombre) {
        const marcaExistente = marcas.find((m) => m.name.toLowerCase() === marcaNombre.toLowerCase());
        if (marcaExistente) {
          finalMarcaId = marcaExistente.id.toString();
          console.log(`✓ Marca encontrada: ${marcaExistente.name} (ID: ${finalMarcaId})`);
          setMarcaId(finalMarcaId);
        } else {
          console.log(`⚠️ Marca "${marcaNombre}" no existe, creándola...`);
          const nuevoMarcaId = await crearMarcaSiNoExiste(marcaNombre);
          if (nuevoMarcaId) {
            finalMarcaId = nuevoMarcaId.toString();
            await cargarCatalogos();
            setMarcaId(finalMarcaId);
            console.log(`✅ Marca creada: ${marcaNombre} (ID: ${finalMarcaId})`);
          }
        }
      }

      if (modeloNombre) {
        console.log(`🔍 Buscando modelo "${modeloNombre}"...`);
        const modelosActualizados = await obtenerModelosActualizados();
        console.log(`📊 Total de modelos actualizados: ${modelosActualizados.length}`);

        const modeloExistente = modelosActualizados.find(
          (m) => m.name.toLowerCase() === modeloNombre.toLowerCase()
        );

        if (modeloExistente) {
          console.log(`✓ Modelo encontrado: ${modeloExistente.name} (ID: ${modeloExistente.id})`);
          setModeloId(modeloExistente.id.toString());
          // Asegurar que el modelo esté en la lista filtrada
          setModelosFiltrados(modelosActualizados);
          console.log(`📊 Modelos filtrados actualizados: ${modelosActualizados.length}`);
        } else {
          console.log(`⚠️ Modelo "${modeloNombre}" no existe en base de datos, creándolo...`);

          let brandIdParaModelo = finalMarcaId ? parseInt(finalMarcaId, 10) : null;
          console.log(`🏷️ Brand ID para crear modelo: ${brandIdParaModelo}`);

          if (!brandIdParaModelo && marcas.length > 0) {
            console.log('⚠️ No hay marca definida, usando marca genérica...');
            let marcaGenerica = marcas.find((m) => m.name.toLowerCase() === 'genérico' || m.name.toLowerCase() === 'generico');

            if (!marcaGenerica) {
              console.log('📝 Creando marca genérica...');
              const idMarcaGenerica = await crearMarcaSiNoExiste('Genérico');
              if (idMarcaGenerica) {
                await cargarCatalogos();
                const marcasActualizadas = await obtenerMarcasActualizadas();
                marcaGenerica = marcasActualizadas.find((m) => m.id === idMarcaGenerica);
                console.log(`✅ Marca genérica creada: ID ${idMarcaGenerica}`);
              }
            } else {
              console.log(`✓ Marca genérica encontrada: ID ${marcaGenerica.id}`);
            }

            if (marcaGenerica) {
              brandIdParaModelo = marcaGenerica.id;
            }
          }

          if (brandIdParaModelo) {
            console.log(`📝 Creando modelo "${modeloNombre}" con brand_id: ${brandIdParaModelo}...`);
            const nuevoModeloId = await crearModeloSiNoExiste(
              brandIdParaModelo,
              modeloNombre
            );
            if (nuevoModeloId) {
              console.log(`✅ Modelo creado con ID: ${nuevoModeloId}, recargando catálogos...`);
              await cargarCatalogos();

              // Obtener los modelos actualizados y actualizar el estado
              const modelosActualizadosNuevos = await obtenerModelosActualizados();
              setModelos(modelosActualizadosNuevos);
              setModelosFiltrados(modelosActualizadosNuevos);

              setModeloId(nuevoModeloId.toString());
              console.log(`✅ Modelo seleccionado: ${modeloNombre} (ID: ${nuevoModeloId})`);
              console.log(`📊 Total de modelos después de crear: ${modelosActualizadosNuevos.length}`);
            } else {
              console.error(`❌ Error al crear modelo "${modeloNombre}"`);
            }
          } else {
            console.error('❌ No se pudo crear el modelo: no hay brand_id disponible');
          }
        }
      }

      inicializacionCompletada.current = true;
    };

    inicializarMarcaYModelo();
  }, [marcas, modelos]);

  const obtenerMarcasActualizadas = async (): Promise<VehicleBrand[]> => {
    try {
      const { data: brandsData, error: brandsError } = await supabase
        .from('vehicle_brands')
        .select('id, name')
        .eq('active', true)
        .order('name', { ascending: true });

      if (brandsError) {
        console.error('Error obteniendo marcas actualizadas:', brandsError);
        return [];
      }

      return (brandsData as VehicleBrand[]) || [];
    } catch (err) {
      console.error('Error inesperado obteniendo marcas:', err);
      return [];
    }
  };

  const obtenerModelosActualizados = async (): Promise<VehicleModel[]> => {
    try {
      const { data: modelsData, error: modelsError } = await supabase
        .from('vehicle_models')
        .select('id, brand_id, name')
        .eq('active', true)
        .order('name', { ascending: true });

      if (modelsError) {
        console.error('Error obteniendo modelos actualizados:', modelsError);
        return [];
      }

      return (modelsData as VehicleModel[]) || [];
    } catch (err) {
      console.error('Error inesperado obteniendo modelos:', err);
      return [];
    }
  };

  const crearMarcaSiNoExiste = async (nombreMarca: string): Promise<number | null> => {
    try {
      const { data: existente, error: errorBusqueda } = await supabase
        .from('vehicle_brands')
        .select('id, name')
        .ilike('name', nombreMarca)
        .maybeSingle();

      if (errorBusqueda) {
        console.error('Error buscando marca:', errorBusqueda);
        return null;
      }

      if (existente) {
        return existente.id;
      }

      const { data: nuevaMarca, error: errorCreacion } = await supabase
        .from('vehicle_brands')
        .insert([{ name: nombreMarca, active: true }])
        .select('id')
        .single();

      if (errorCreacion) {
        console.error('Error creando marca:', errorCreacion);
        return null;
      }

      console.log(`✅ Marca "${nombreMarca}" creada automáticamente`);
      return nuevaMarca.id;
    } catch (err) {
      console.error('Error inesperado creando marca:', err);
      return null;
    }
  };

  const crearModeloSiNoExiste = async (brandId: number, nombreModelo: string): Promise<number | null> => {
    try {
      const { data: existente, error: errorBusqueda } = await supabase
        .from('vehicle_models')
        .select('id, name')
        .eq('brand_id', brandId)
        .ilike('name', nombreModelo)
        .maybeSingle();

      if (errorBusqueda) {
        console.error('Error buscando modelo:', errorBusqueda);
        return null;
      }

      if (existente) {
        return existente.id;
      }

      const { data: nuevoModelo, error: errorCreacion } = await supabase
        .from('vehicle_models')
        .insert([{ brand_id: brandId, name: nombreModelo, active: true }])
        .select('id')
        .single();

      if (errorCreacion) {
        console.error('Error creando modelo:', errorCreacion);
        return null;
      }

      console.log(`✅ Modelo "${nombreModelo}" creado automáticamente para marca ID ${brandId}`);
      return nuevoModelo.id;
    } catch (err) {
      console.error('Error inesperado creando modelo:', err);
      return null;
    }
  };

  const cargarCatalogos = async () => {
    try {
      const { data: brandsData, error: brandsError } = await supabase
        .from('vehicle_brands')
        .select('id, name')
        .eq('active', true)
        .order('name', { ascending: true });

      if (brandsError) {
        console.error('Error cargando marcas:', brandsError);
      } else {
        setMarcas((brandsData as VehicleBrand[]) || []);
      }

      const { data: modelsData, error: modelsError } = await supabase
        .from('vehicle_models')
        .select('id, brand_id, name')
        .eq('active', true)
        .order('name', { ascending: true });

      if (modelsError) {
        console.error('Error cargando modelos:', modelsError);
      } else {
        setModelos((modelsData as VehicleModel[]) || []);
      }
    } catch (err) {
      console.error('Error inesperado cargando catálogos:', err);
    }
  };

  const handleFotosVehiculoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 4) {
        setError('Máximo 4 fotos del vehículo (frente, trasera, ambos costados)');
        return;
      }
      if (filesArray.length < 4) {
        setError('Debe subir exactamente 4 fotos del vehículo (frente, trasera, ambos costados)');
        return;
      }
      setFotosVehiculo(filesArray);
      setError('');
    }
  };

  const handleFotoOdometroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoOdometro(e.target.files[0]);
    }
  };

  const handleFotoTableroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoTablero(e.target.files[0]);
    }
  };

  const buscarEquipoEnInventarioAhora = async (esnValue: string) => {
    console.log('🔎 [PrefolioForm] Iniciando búsqueda con ESN:', esnValue);

    if (!esnValue || esnValue.trim().length < 3) {
      console.log('⚠️ [PrefolioForm] ESN muy corto o vacío');
      return;
    }

    const esModoEspecial = esnValue === '000000000000000';
    if (esModoEspecial) {
      console.log('🧪 [PrefolioForm] ESN de prueba detectado - consultando Zoho CRM normalmente');
    }

    setBuscandoEquipo(true);
    setEquipoBuscado(false);
    setEquipoEncontradoEnCRM(false);

    console.log('🔍 [PrefolioForm] Llamando a buscarEquipoEnInventario con ESN:', esnValue.trim());
    const resultado = await buscarEquipoEnInventario(esnValue.trim());
    console.log('📋 [PrefolioForm] Resultado completo:', {
      success: resultado.success,
      data: resultado.data,
      error: resultado.error
    });

    if (resultado.success && resultado.data) {
      console.log('✅ [PrefolioForm] Equipo encontrado, actualizando estados:', resultado.data);
      setEsn(esnValue);
      setZohoInventoryId(resultado.data.id);
      setModeloDispositivo(resultado.data.model);
      setImei(resultado.data.IMEI);
      setTelefonoSim(resultado.data.linea);
      setEquipoBuscado(true);
      setEquipoEncontradoEnCRM(true);
    } else {
      console.error('❌ [PrefolioForm] No se encontró equipo. Error:', resultado.error);
      console.error('❌ [PrefolioForm] Detalles del resultado:', JSON.stringify(resultado, null, 2));
      setEsn(esnValue);
      setZohoInventoryId('');
      setModeloDispositivo('');
      setImei('');
      setTelefonoSim('');
      setEquipoBuscado(true);
      setEquipoEncontradoEnCRM(false);
    }

    setBuscandoEquipo(false);
  };

  const handleQRScanSuccess = (decodedText: string) => {
    setMostrarQRScanner(false);
    buscarEquipoEnInventarioAhora(decodedText);
  };

  const handleGuardarEsnManual = () => {
    if (esnTemporal.trim()) {
      buscarEquipoEnInventarioAhora(esnTemporal);
      setCapturaManualEnabled(false);
    }
  };

  const handleVinDetected = (detectedVin: string, photo: File) => {
    setVin(detectedVin);
    setFotoVin(photo);
    setVinManualEnabled(true);
    setError('');
  };

  const handlePlacaDetected = (detectedPlaca: string, photo: File) => {
    setPlacas(detectedPlaca);
    setFotoPlacas(photo);
    setError('');
  };

  const validarFormulario = (): boolean => {
    // Validar ESN primero (campo crítico)
    if (!esn.trim()) {
      setError('El ESN / N° de Serie / MDT es obligatorio');
      return false;
    }

    if (!marcaId) {
      setError('La marca del vehículo es obligatoria');
      return false;
    }
    if (!modeloId) {
      setError('El modelo del vehículo es obligatorio');
      return false;
    }
    if (!vin.trim()) {
      setError('El número VIN es obligatorio');
      return false;
    }
    if (!odometro.trim()) {
      setError('El odómetro es obligatorio (colocar 0 si no se cuenta con él)');
      return false;
    }
    if (!placas.trim()) {
      setError('El número de placas es obligatorio');
      return false;
    }
    if (!color.trim()) {
      setError('El color del vehículo es obligatorio');
      return false;
    }
    if (fotosVehiculo.length !== 4) {
      setError('Debe subir exactamente 4 fotos del vehículo (frente, trasera, ambos costados)');
      return false;
    }
    if (!fotoOdometro) {
      setError('Debe subir la foto del odómetro');
      return false;
    }
    if (!fotoTablero) {
      setError('Debe subir la foto del tablero');
      return false;
    }
    if (!fotoVin && !vinManualEnabled) {
      setError('Debe tomar una foto del VIN o usar la opción de captura manual');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validarFormulario()) {
      return;
    }

    setGuardando(true);

    try {
      // Validar duplicados de ESN (excepto si es el ESN especial de prueba)
      if (esn !== '000000000000000') {
        const { data: expedientesConESN, error: errorBusqueda } = await supabase
          .from('expedientes_servicio')
          .select('work_order_name, appointment_name, id')
          .eq('device_esn', esn)
          .neq('id', expediente.id);

        if (errorBusqueda) {
          console.error('Error al buscar ESN:', errorBusqueda);
          setError('Error al verificar el ESN. Intenta nuevamente.');
          setGuardando(false);
          return;
        }

        if (expedientesConESN && expedientesConESN.length > 0) {
          const expedientePrevio = expedientesConESN[0];
          const mensaje = `⚠️ ALERTA: El ESN "${esn}" ya fue utilizado en:\n\nWO: ${expedientePrevio.work_order_name}\nAP: ${expedientePrevio.appointment_name}\n\n¿Estás seguro de que quieres usar este ESN en el servicio actual?`;

          const confirmacion = confirm(mensaje);
          if (!confirmacion) {
            setError('Uso de ESN cancelado. Por favor, verifica el ESN e intenta nuevamente.');
            setGuardando(false);
            return;
          }
        }
      }

      const marcaSeleccionada = marcas.find((m) => m.id === parseInt(marcaId, 10));
      const modeloSeleccionado = modelos.find((m) => m.id === parseInt(modeloId, 10));

      const datosPrefolio = {
        prefolio_realizado: true,
        asset_marca: marcaSeleccionada?.name || undefined,
        asset_submarca: modeloSeleccionado?.name || undefined,
        asset_vin: vin,
        vehicle_odometer: parseFloat(odometro) || 0,
        asset_placas: placas,
        asset_color: color,
        asset_economico: numeroEconomico || undefined,
        vehicle_year: año || undefined,
        prefolio_modelo_dispositivo: modeloDispositivo || undefined,
        device_esn: esn || undefined,
        prefolio_imei_dispositivo: imei || undefined,
        prefolio_telefono_sim: telefonoSim || undefined,
        zoho_inventory_id: zohoInventoryId || undefined,
      };

      const exitoDatos = await guardarPrefolioDatos(expediente.id, datosPrefolio);

      if (!exitoDatos) {
        setError('Error al guardar los datos del prefolio');
        setGuardando(false);
        return;
      }

      const resultadoFotos = await guardarPrefolioFotos(
        expediente.id,
        fotosVehiculo,
        fotoOdometro,
        fotoVin,
        fotoPlacas,
        fotoTablero
      );

      if (!resultadoFotos.success) {
        setError(`Error al guardar fotos: ${resultadoFotos.error}`);
        setGuardando(false);
        return;
      }

      console.log('✅ [PREFOLIO] Datos y fotos guardados exitosamente');

      // Verificar cambios de vehículo para webhooks
      const vinOriginal = (expediente.asset_vin || '').trim().toUpperCase();
      const vinNuevo = vin.trim().toUpperCase();
      const vinCambio = vinNuevo.length > 0 && vinNuevo !== vinOriginal;

      // Verificar otros cambios de vehículo (solo si realmente cambiaron)
      const placasOriginal = (expediente.asset_placas || '').trim().toUpperCase();
      const placasNuevo = placas.trim().toUpperCase();
      const colorOriginal = (expediente.asset_color || '').trim().toLowerCase();
      const colorNuevo = color.trim().toLowerCase();
      const economicoOriginal = (expediente.asset_economico || '').trim();
      const economicoNuevo = numeroEconomico.trim();
      const añoOriginal = (expediente.vehicle_year || '').trim();
      const añoNuevo = año.trim();
      const odometroOriginal = expediente.vehicle_odometer || 0;
      const odometroNuevo = parseFloat(odometro) || 0;

      const cambioPlacas = placasNuevo.length > 0 && placasNuevo !== placasOriginal;
      const cambioColor = colorNuevo.length > 0 && colorNuevo !== colorOriginal;
      const cambioEconomico = economicoNuevo.length > 0 && economicoNuevo !== economicoOriginal;
      const cambioAño = añoNuevo.length > 0 && añoNuevo !== añoOriginal;
      const cambioOdometro = odometroNuevo > 0 && odometroNuevo !== odometroOriginal;

      const otrosCambios = cambioPlacas || cambioColor || cambioEconomico || cambioAño || cambioOdometro;

      // Enviar webhook de CreateAsset si VIN cambió
      if (vinCambio) {
        console.log('🔔 [PREFOLIO] VIN cambió - enviando webhook CreateAsset...');
        const resultadoAsset = await notificarCreacionAsset({
          appointment_name: expediente.appointment_name || '',
          work_order_name: expediente.work_order_name || '',
          esn: esn,
          technician_email: expediente.email_tecnico || '',
          company_Id: expediente.company_Id || '',
          asset_data: {
            vin: vinNuevo,
            vin_original: vinOriginal,
            placas: placas || undefined,
            color: color || undefined,
            marca: marcaSeleccionada?.name || undefined,
            modelo: modeloSeleccionado?.name || undefined,
            año: año || undefined,
            numero_economico: numeroEconomico || undefined,
            odometro: odometro || undefined,
          }
        });

        if (!resultadoAsset.success) {
          console.error('❌ [PREFOLIO] Error al enviar CreateAsset:', resultadoAsset.error);
        } else {
          console.log('✅ [PREFOLIO] Webhook CreateAsset enviado exitosamente');
        }
      } else if (otrosCambios && !vinCambio) {
        // Enviar webhook de EditAsset si hay otros cambios (pero no VIN)
        console.log('🔔 [PREFOLIO] Datos de vehículo cambiaron - enviando webhook EditAsset...');
        const resultadoAsset = await notificarEdicionAsset({
          appointment_name: expediente.appointment_name || '',
          work_order_name: expediente.work_order_name || '',
          esn: esn,
          technician_email: expediente.email_tecnico || '',
          company_Id: expediente.company_Id || '',
          asset_data: {
            vin: vinNuevo || undefined,
            placas: placas || undefined,
            color: color || undefined,
            marca: marcaSeleccionada?.name || undefined,
            modelo: modeloSeleccionado?.name || undefined,
            año: año || undefined,
            numero_economico: numeroEconomico || undefined,
            odometro: odometro || undefined,
          }
        });

        if (!resultadoAsset.success) {
          console.error('❌ [PREFOLIO] Error al enviar EditAsset:', resultadoAsset.error);
        } else {
          console.log('✅ [PREFOLIO] Webhook EditAsset enviado exitosamente');
        }
      }

      console.log('🔔 [PREFOLIO] Enviando notificación de inicio de trabajo...');

      // Enviar notificación de inicio de trabajo (start_work)
      const resultadoTransicion = await notificarInicioTrabajo({
        appointment_name: expediente.appointment_name || '',
        work_order_name: expediente.work_order_name || '',
        esn: esn,
        technician_email: expediente.email_tecnico || '',
        company_Id: expediente.company_Id || ''
      });

      if (!resultadoTransicion.success) {
        console.error('❌ [PREFOLIO] Error al enviar notificación de inicio:', resultadoTransicion.error);
        const confirmar = confirm(
          `El prefolio se guardó correctamente, pero hubo un error al notificar el inicio del trabajo:\n\n${resultadoTransicion.error}\n\n¿Deseas continuar de todas formas?`
        );

        if (!confirmar) {
          setGuardando(false);
          return;
        }
      } else {
        console.log('✅ [PREFOLIO] Notificación de inicio de trabajo enviada exitosamente');
      }

      setTimeout(() => {
        setGuardando(false);
        onCompleted();
      }, 500);
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError('Error inesperado al guardar el prefolio');
      setGuardando(false);
    }
  };

  const pruebasRequeridas = traducirPruebasDesdeInstallationDetails(
    expediente.installation_details || ''
  );

  return (
    <div className="space-y-6">
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          Detalles del servicio
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Tipo de servicio</p>
              <p className="text-sm font-medium text-gray-800">{expediente.service_type}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Unidad</p>
              <p className="text-sm font-medium text-gray-800">{expediente.asset_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Empresa</p>
              <p className="text-sm font-medium text-gray-800">{expediente.company_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Cliente</p>
              <p className="text-sm font-medium text-gray-800">{expediente.client_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Técnico</p>
              <p className="text-sm font-medium text-gray-800">{expediente.technician_name}</p>
              <p className="text-xs text-gray-500">{expediente.technician_phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Servidor / Plataforma</p>
              <p className="text-sm font-medium text-gray-800">
                {expediente.server_name} / {expediente.platform_number}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Dirección</p>
              <p className="text-sm font-medium text-gray-800">
                {expediente.service_street}, {expediente.service_city}
              </p>
              <p className="text-xs text-gray-500">
                {expediente.service_state}, {expediente.service_zip_code}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Horario programado</p>
              <p className="text-sm font-medium text-gray-800">
                {expediente.scheduled_start_time && formatearFecha(expediente.scheduled_start_time)} - {expediente.scheduled_end_time && formatearFecha(expediente.scheduled_end_time).split(' ')[1]}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-300 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Pruebas requeridas</p>
          <div className="flex flex-wrap gap-2">
            {pruebasRequeridas.map(prueba => (
              <span
                key={prueba}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300"
              >
                {prueba}
              </span>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Datos del Vehículo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca del Vehículo *
              </label>
              <select
                value={marcaId}
                onChange={(e) => {
                  setMarcaId(e.target.value);
                  setModeloId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione una marca</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo del Vehículo *
              </label>
              <select
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione un modelo</option>
                {modelosFiltrados.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número VIN *
              </label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder={vinManualEnabled ? "Ingrese el VIN del vehículo" : "Escanee el VIN con el botón de abajo"}
                required
                disabled={!vinManualEnabled && !fotoVin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {!fotoVin ? (
                <div className="mt-2 space-y-2">
                  <VinScannerWithPhoto
                    onVinDetected={handleVinDetected}
                    currentVin={vin}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('⚠️ IMPORTANTE: El escaneo del VIN es obligatorio.\n\n¿No es posible tomar la foto del VIN por problemas de ubicación u otras limitaciones?\n\nEsta opción debe usarse SOLO como última alternativa.')) {
                        setVinManualEnabled(true);
                      }
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    No puedo tomar foto del VIN - Habilitar captura manual
                  </button>
                </div>
              ) : (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✓ VIN capturado mediante foto. Puedes editar el campo si detectas algún error en la lectura.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Odómetro *
              </label>
              <input
                type="number"
                value={odometro}
                onChange={(e) => setOdometro(e.target.value)}
                placeholder="Colocar 0 si no cuenta con odómetro"
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no cuenta con odómetro, colocar 0
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de placas *
              </label>
              <input
                type="text"
                value={placas}
                onChange={(e) => setPlacas(e.target.value.toUpperCase())}
                placeholder={fotoPlacas ? "Placas capturadas. Edita si hay errores" : "Escanee las placas con el botón de abajo"}
                required
                disabled={!fotoPlacas}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {!fotoPlacas ? (
                <PlacaScannerWithPhoto
                  onPlacaDetected={handlePlacaDetected}
                  currentPlaca={placas}
                />
              ) : (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✓ Placas capturadas mediante foto. Puedes editar el campo si detectas algún error en la lectura.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color del Vehículo *
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color del vehículo"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número económico
              </label>
              <input
                type="text"
                value={numeroEconomico}
                onChange={(e) => setNumeroEconomico(e.target.value)}
                placeholder="Número económico del vehículo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="text"
                value={año}
                onChange={(e) => setAño(e.target.value)}
                placeholder="Año del vehículo"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Equipo
          </h3>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              ESN *
            </label>

            {!esn && !buscandoEquipo && !capturaManualEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => setMostrarQRScanner(true)}
                  className="w-full px-4 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-base">Escanear</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCapturaManualEnabled(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Captura manual
                  </button>
                </div>
              </>
            )}

            {capturaManualEnabled && !esn && !buscandoEquipo && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={esnTemporal}
                  onChange={(e) => setEsnTemporal(e.target.value)}
                  placeholder="Ingresa el ESN"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGuardarEsnManual}
                    disabled={!esnTemporal.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturaManualEnabled(false);
                      setEsnTemporal('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {buscandoEquipo && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            )}

            {esn && !buscandoEquipo && equipoBuscado && (
              <div className="space-y-3">
                {equipoEncontradoEnCRM ? (
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-900">Se encontró en CRM</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEsn('');
                          setEquipoBuscado(false);
                          setEquipoEncontradoEnCRM(false);
                          setZohoInventoryId('');
                          setModeloDispositivo('');
                          setImei('');
                          setTelefonoSim('');
                        }}
                        className="p-2 text-green-700 hover:text-green-900 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <p className="text-xs text-gray-600 mb-1">ESN</p>
                        <p className="font-mono font-bold text-gray-900">{esn}</p>
                      </div>

                      {zohoInventoryId && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">ID Inventario</p>
                          <p className="font-mono text-gray-900">{zohoInventoryId}</p>
                        </div>
                      )}

                      {modeloDispositivo && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">Modelo</p>
                          <p className="font-medium text-gray-900">{modeloDispositivo}</p>
                        </div>
                      )}

                      {imei && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">IMEI</p>
                          <p className="font-mono text-gray-900">{imei}</p>
                        </div>
                      )}

                      {telefonoSim && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">Línea</p>
                          <p className="font-mono text-gray-900">{telefonoSim}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">No se encontró en CRM</p>
                          <p className="font-mono text-sm text-amber-800 mt-1">{esn}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEsn('');
                          setEquipoBuscado(false);
                          setEquipoEncontradoEnCRM(false);
                          setZohoInventoryId('');
                          setModeloDispositivo('');
                          setImei('');
                          setTelefonoSim('');
                        }}
                        className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Evidencia Fotográfica
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotos del Vehículo *
                <span className="text-xs text-gray-500 ml-2">
                  (Exactamente 4 fotos: frente, trasera, ambos costados)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <FileImage className="w-4 h-4" />
                  <span className="text-sm">Tomar/Elegir fotos</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFotosVehiculoChange}
                    className="hidden"
                    required
                  />
                </label>
                <span className="text-sm text-gray-600">
                  {fotosVehiculo.length > 0
                    ? `${fotosVehiculo.length} archivo(s) seleccionado(s)`
                    : 'No se eligió ningún archivo'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto del Odómetro *
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <FileImage className="w-4 h-4" />
                  <span className="text-sm">Tomar/Elegir foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoOdometroChange}
                    className="hidden"
                    required
                  />
                </label>
                <span className="text-sm text-gray-600">
                  {fotoOdometro ? fotoOdometro.name : 'No se eligió ningún archivo'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto del Tablero *
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <FileImage className="w-4 h-4" />
                  <span className="text-sm">Tomar/Elegir foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoTableroChange}
                    className="hidden"
                    required
                  />
                </label>
                <span className="text-sm text-gray-600">
                  {fotoTablero ? fotoTablero.name : 'No se eligió ningún archivo'}
                </span>
              </div>
            </div>

            {fotoVin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto del VIN
                </label>
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">
                      ✓ Foto capturada automáticamente durante el escaneo
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {guardando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando información...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Continuar con las pruebas
              </>
            )}
          </button>
        </div>
      </form>

      {mostrarQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setMostrarQRScanner(false)}
        />
      )}
    </div>
  );
}
