export interface ServicioHistorial {
  id: string;
  workOrder: string;
  appointment: string;
  fecha: string;
  tipoServicio: string;
  monto: number;
  estatusPago: 'Pagado' | 'Pendiente';
}

export const mockServicios: ServicioHistorial[] = [
  {
    id: '1',
    workOrder: 'WO2024001',
    appointment: 'AP-0001',
    fecha: '2024-12-15',
    tipoServicio: 'Instalación',
    monto: 1500.00,
    estatusPago: 'Pagado'
  },
  {
    id: '2',
    workOrder: 'WO2024002',
    appointment: 'AP-0002',
    fecha: '2024-12-14',
    tipoServicio: 'Revisión',
    monto: 800.00,
    estatusPago: 'Pendiente'
  },
  {
    id: '3',
    workOrder: 'WO2024003',
    appointment: 'AP-0003',
    fecha: '2024-12-13',
    tipoServicio: 'Instalación',
    monto: 1500.00,
    estatusPago: 'Pendiente'
  },
  {
    id: '4',
    workOrder: 'WO2024004',
    appointment: 'AP-0004',
    fecha: '2024-12-12',
    tipoServicio: 'Desinstalación',
    monto: 600.00,
    estatusPago: 'Pagado'
  },
  {
    id: '5',
    workOrder: 'WO2024005',
    appointment: 'AP-0005',
    fecha: '2024-12-11',
    tipoServicio: 'Reinstalación',
    monto: 1200.00,
    estatusPago: 'Pendiente'
  },
  {
    id: '6',
    workOrder: 'WO2024006',
    appointment: 'AP-0006',
    fecha: '2024-12-10',
    tipoServicio: 'Revisión',
    monto: 800.00,
    estatusPago: 'Pagado'
  },
  {
    id: '7',
    workOrder: 'WO2024007',
    appointment: 'AP-0007',
    fecha: '2024-12-09',
    tipoServicio: 'Instalación',
    monto: 1500.00,
    estatusPago: 'Pagado'
  },
  {
    id: '8',
    workOrder: 'WO2024008',
    appointment: 'AP-0008',
    fecha: '2024-12-08',
    tipoServicio: 'Mantenimiento',
    monto: 500.00,
    estatusPago: 'Pendiente'
  }
];
