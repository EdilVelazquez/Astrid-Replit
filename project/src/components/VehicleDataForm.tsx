import { useState, useEffect } from 'react';
import { Car, Check, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { VinScanner } from './VinScanner';
import { PlacaScanner } from './PlacaScanner';

interface VehicleData {
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_color: string;
  vehicle_vin: string;
  vehicle_license_plate: string;
  vehicle_odometer: string;
}

interface VehicleDataFormProps {
  onComplete: (data: VehicleData) => Promise<void>;
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

export function VehicleDataForm({ onComplete }: VehicleDataFormProps) {
  const [currentField, setCurrentField] = useState(0);
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    vehicle_vin: '',
    vehicle_license_plate: '',
    vehicle_odometer: ''
  });
  const [sinPlacas, setSinPlacas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<VehicleModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const [usarEntradaManualMarca, setUsarEntradaManualMarca] = useState(false);
  const [usarEntradaManualModelo, setUsarEntradaManualModelo] = useState(false);
  const [usarEntradaManualVin, setUsarEntradaManualVin] = useState(false);
  const [usarEntradaManualPlaca, setUsarEntradaManualPlaca] = useState(false);

  useEffect(() => {
    loadBrands();
    loadModels();
  }, []);

  const loadBrands = async () => {
    const { data, error } = await supabase
      .from('vehicle_brands')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error loading brands:', error);
      return;
    }

    setBrands(data || []);
  };

  const loadModels = async () => {
    const { data, error } = await supabase
      .from('vehicle_models')
      .select('id, brand_id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error loading models:', error);
      return;
    }

    setModels(data || []);
  };

  useEffect(() => {
    if (selectedBrandId) {
      const filtered = models.filter(m => m.brand_id === selectedBrandId);
      setFilteredModels(filtered);
    } else {
      setFilteredModels([]);
    }
  }, [selectedBrandId, models]);

  const fields = [
    { key: 'vehicle_brand', label: 'Marca', placeholder: 'Seleccione o ingrese marca', hasCatalog: true },
    { key: 'vehicle_model', label: 'Modelo', placeholder: 'Seleccione o ingrese modelo', hasCatalog: true },
    { key: 'vehicle_year', label: 'Año', placeholder: 'Ej: 2023' },
    { key: 'vehicle_color', label: 'Color', placeholder: 'Ej: Blanco' },
    { key: 'vehicle_vin', label: 'VIN', placeholder: 'Número de identificación vehicular' },
    { key: 'vehicle_license_plate', label: 'Placas', placeholder: 'Ej: ABC-123-D', skipable: true },
    { key: 'vehicle_odometer', label: 'Odómetro', placeholder: 'Kilometraje actual' }
  ];

  const currentFieldData = fields[currentField];

  const handleInputChange = (value: string) => {
    const uppercaseValue = value.toUpperCase();
    setVehicleData(prev => ({
      ...prev,
      [currentFieldData.key]: uppercaseValue
    }));
  };

  const handleBrandSelect = (brandId: number, brandName: string) => {
    setSelectedBrandId(brandId);
    setVehicleData(prev => ({
      ...prev,
      vehicle_brand: brandName
    }));
  };

  const handleModelSelect = (modelName: string) => {
    setVehicleData(prev => ({
      ...prev,
      vehicle_model: modelName
    }));
  };

  const handleNext = () => {
    const value = vehicleData[currentFieldData.key as keyof VehicleData];

    if (currentFieldData.key === 'vehicle_license_plate' && sinPlacas) {
      setVehicleData(prev => ({ ...prev, vehicle_license_plate: 'SP' }));
      if (currentField < fields.length - 1) {
        setCurrentField(currentField + 1);
      }
      return;
    }

    if (!value.trim()) {
      return;
    }

    if (currentField < fields.length - 1) {
      setCurrentField(currentField + 1);

      if (currentFieldData.key === 'vehicle_brand') {
        setUsarEntradaManualModelo(false);
      }
    }
  };

  const handleBack = () => {
    if (currentField > 0) {
      setCurrentField(currentField - 1);
      setSinPlacas(false);

      if (currentField === 1) {
        setUsarEntradaManualModelo(false);
      }
    }
  };

  const handleSubmit = async () => {
    const value = vehicleData[currentFieldData.key as keyof VehicleData];
    if (!value.trim()) {
      return;
    }

    setSubmitting(true);
    await onComplete(vehicleData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (currentField === fields.length - 1) {
        handleSubmit();
      } else {
        handleNext();
      }
    }
  };

  const handleSinPlacasToggle = () => {
    setSinPlacas(!sinPlacas);
    if (!sinPlacas) {
      setVehicleData(prev => ({ ...prev, vehicle_license_plate: 'SP' }));
    } else {
      setVehicleData(prev => ({ ...prev, vehicle_license_plate: '' }));
    }
  };

  const handleVinDetected = (vin: string) => {
    setVehicleData(prev => ({
      ...prev,
      vehicle_vin: vin
    }));
    setUsarEntradaManualVin(false);
  };

  const handlePlacaDetected = (placa: string) => {
    setVehicleData(prev => ({
      ...prev,
      vehicle_license_plate: placa
    }));
    setUsarEntradaManualPlaca(false);
    setSinPlacas(false);
  };

  const isCurrentFieldValid = () => {
    if (currentFieldData.key === 'vehicle_license_plate' && sinPlacas) {
      return true;
    }
    const value = vehicleData[currentFieldData.key as keyof VehicleData];
    return value.trim().length > 0;
  };

  const renderBrandField = () => {
    if (usarEntradaManualMarca) {
      return (
        <input
          type="text"
          value={vehicleData.vehicle_brand}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={currentFieldData.placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg uppercase"
          autoFocus
        />
      );
    }

    return (
      <div className="relative">
        <select
          value={vehicleData.vehicle_brand}
          onChange={(e) => {
            const selectedBrand = brands.find(b => b.name === e.target.value);
            if (selectedBrand) {
              handleBrandSelect(selectedBrand.id, selectedBrand.name);
            }
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none bg-white"
          autoFocus
        >
          <option value="">Seleccione una marca</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.name}>
              {brand.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    );
  };

  const renderModelField = () => {
    if (usarEntradaManualModelo) {
      return (
        <input
          type="text"
          value={vehicleData.vehicle_model}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={currentFieldData.placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg uppercase"
          autoFocus
        />
      );
    }

    if (!selectedBrandId || filteredModels.length === 0) {
      return (
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-center">
          {!selectedBrandId
            ? 'Primero seleccione una marca'
            : 'No hay modelos disponibles, use entrada manual'}
        </div>
      );
    }

    return (
      <div className="relative">
        <select
          value={vehicleData.vehicle_model}
          onChange={(e) => handleModelSelect(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none bg-white"
          autoFocus
        >
          <option value="">Seleccione un modelo</option>
          {filteredModels.map((model) => (
            <option key={model.id} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
    );
  };

  const renderField = () => {
    if (currentFieldData.key === 'vehicle_brand') {
      return renderBrandField();
    }

    if (currentFieldData.key === 'vehicle_model') {
      return renderModelField();
    }

    const isVinFieldDisabled = currentFieldData.key === 'vehicle_vin' && !usarEntradaManualVin;
    const isPlacaFieldDisabled = currentFieldData.key === 'vehicle_license_plate' && !usarEntradaManualPlaca && !sinPlacas;

    return (
      <input
        type="text"
        value={vehicleData[currentFieldData.key as keyof VehicleData]}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={
          currentFieldData.key === 'vehicle_vin' && !usarEntradaManualVin
            ? 'Use el botón "Escanear VIN" para capturar automáticamente'
            : currentFieldData.key === 'vehicle_license_plate' && !usarEntradaManualPlaca && !sinPlacas
            ? 'Use el botón "Escanear Placas" para capturar automáticamente'
            : currentFieldData.placeholder
        }
        disabled={submitting || (currentFieldData.key === 'vehicle_license_plate' && sinPlacas) || isVinFieldDisabled || isPlacaFieldDisabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-lg uppercase"
        autoFocus={!isVinFieldDisabled && !isPlacaFieldDisabled}
        readOnly={isVinFieldDisabled || isPlacaFieldDisabled}
      />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Car className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Datos del vehículo</h3>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            Campo {currentField + 1} de {fields.length}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(((currentField + 1) / fields.length) * 100)}% completado
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentField + 1) / fields.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {currentFieldData.label}
          </label>
          {renderField()}
        </div>

        {currentFieldData.key === 'vehicle_brand' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="entrada-manual-marca"
              checked={usarEntradaManualMarca}
              onChange={(e) => {
                setUsarEntradaManualMarca(e.target.checked);
                if (e.target.checked) {
                  setVehicleData(prev => ({ ...prev, vehicle_brand: '' }));
                  setSelectedBrandId(null);
                }
              }}
              disabled={submitting}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="entrada-manual-marca" className="text-sm text-gray-700">
              Ingresar marca manualmente
            </label>
          </div>
        )}

        {currentFieldData.key === 'vehicle_model' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="entrada-manual-modelo"
              checked={usarEntradaManualModelo}
              onChange={(e) => {
                setUsarEntradaManualModelo(e.target.checked);
                if (e.target.checked) {
                  setVehicleData(prev => ({ ...prev, vehicle_model: '' }));
                }
              }}
              disabled={submitting}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="entrada-manual-modelo" className="text-sm text-gray-700">
              Ingresar modelo manualmente
            </label>
          </div>
        )}

        {currentFieldData.key === 'vehicle_vin' && (
          <>
            <VinScanner
              onVinDetected={handleVinDetected}
              currentVin={vehicleData.vehicle_vin}
            />

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="entrada-manual-vin"
                  checked={usarEntradaManualVin}
                  onChange={(e) => {
                    setUsarEntradaManualVin(e.target.checked);
                    if (!e.target.checked) {
                      setVehicleData(prev => ({ ...prev, vehicle_vin: '' }));
                    }
                  }}
                  disabled={submitting}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="entrada-manual-vin" className="text-sm text-gray-700">
                  Ingresar VIN manualmente
                </label>
              </div>

              {usarEntradaManualVin && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <strong>Recomendación:</strong> Utilice la opción de "Escanear VIN" adjuntando una imagen para evitar errores de captura.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {currentFieldData.key === 'vehicle_license_plate' && (
          <>
            <PlacaScanner
              onPlacaDetected={handlePlacaDetected}
              currentPlaca={vehicleData.vehicle_license_plate}
            />

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sin-placas"
                  checked={sinPlacas}
                  onChange={handleSinPlacasToggle}
                  disabled={submitting}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sin-placas" className="text-sm text-gray-700">
                  Sin placas
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="entrada-manual-placa"
                  checked={usarEntradaManualPlaca}
                  onChange={(e) => {
                    setUsarEntradaManualPlaca(e.target.checked);
                    if (!e.target.checked) {
                      setVehicleData(prev => ({ ...prev, vehicle_license_plate: '' }));
                    }
                    if (e.target.checked) {
                      setSinPlacas(false);
                    }
                  }}
                  disabled={submitting || sinPlacas}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="entrada-manual-placa" className="text-sm text-gray-700">
                  Ingresar placas manualmente
                </label>
              </div>

              {usarEntradaManualPlaca && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <strong>Recomendación:</strong> Utilice la opción de "Escanear Placas" adjuntando una imagen para evitar errores de captura.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3">
          {currentField > 0 && (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Anterior
            </button>
          )}

          {currentField < fields.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentFieldValid() || submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isCurrentFieldValid() || submitting}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Finalizar
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Presiona Enter para avanzar al siguiente campo
        </p>
      </div>
    </div>
  );
}
