import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  Upload,
  X
} from 'lucide-react';

import {
  buildImportPreview,
  compareTournamentImport,
  readTournamentExcel
} from '../../lib/tournamentImport';

function formatImportDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function removeDuplicateRegistrations(registrations = []) {
  const unique = new Map();

  registrations.forEach((registration) => {
    if (!registration.registrationKey) {
      return;
    }

    if (!unique.has(registration.registrationKey)) {
      unique.set(
        registration.registrationKey,
        registration
      );
    }
  });

  return [...unique.values()];
}

export default function TournamentSync({
  tournament,
  imports = [],
  onConfirmImport
}) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [readResult, setReadResult] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [preview, setPreview] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const tournamentImports = useMemo(
    () =>
      imports
        .filter(
          (item) =>
            item.tournamentId === tournament?.id
        )
        .sort((a, b) =>
          String(b.createdAt || '').localeCompare(
            String(a.createdAt || '')
          )
        ),
    [imports, tournament]
  );

  const resetSelection = () => {
    setSelectedFile(null);
    setReadResult(null);
    setComparison(null);
    setPreview(null);
    setError('');
    setSuccess(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeFile = async (file) => {
    if (!file || !tournament?.id) {
      return;
    }

    setAnalyzing(true);
    setError('');
    setSuccess(null);

    try {
      const rawReadResult =
        await readTournamentExcel({
          file,
          tournament
        });

      const uniqueRegistrations =
        removeDuplicateRegistrations(
          rawReadResult.registrations
        );

      const normalizedReadResult = {
        ...rawReadResult,
        registrations: uniqueRegistrations,
        validRows: uniqueRegistrations.length
      };

      const importComparison =
        await compareTournamentImport({
          tournament,
          importedRegistrations:
            uniqueRegistrations
        });

      const importPreview = buildImportPreview({
        readResult: normalizedReadResult,
        comparison: importComparison
      });

      setSelectedFile(file);
      setReadResult(normalizedReadResult);
      setComparison(importComparison);
      setPreview(importPreview);
    } catch (analysisError) {
      console.error(
        'Error al analizar el Excel:',
        analysisError
      );

      setSelectedFile(null);
      setReadResult(null);
      setComparison(null);
      setPreview(null);

      setError(
        analysisError.message ||
          'No fue posible analizar el archivo.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await analyzeFile(file);
  };

  const confirmImport = async () => {
    if (
      !readResult ||
      !comparison ||
      !onConfirmImport ||
      !tournament?.id
    ) {
      return;
    }

    setImporting(true);
    setError('');
    setSuccess(null);

    try {
      const result = await onConfirmImport({
        tournament,
        readResult,
        comparison
      });

      if (!result) {
        return;
      }

      setSuccess(result);
      setReadResult(null);
      setComparison(null);
      setPreview(null);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (importError) {
      console.error(
        'Error al confirmar la importación:',
        importError
      );

      setError(
        importError.message ||
          'No fue posible importar las inscripciones.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="panel tournament-sync-panel">
      <div className="tournament-sync-box">
        <FileSpreadsheet size={42} />

        <h2>Sincronizar inscripciones</h2>

        <p>
          Sube el Excel descargado de Google Forms. La
          sincronización actualizará parejas, jugadores,
          categorías y estadísticas, pero nunca sobrescribirá
          pagos, descuentos, observaciones internas ni parejas
          eliminadas manualmente.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="primary-btn"
          disabled={analyzing || importing}
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          {analyzing ? (
            <LoaderCircle
              size={18}
              className="loader-icon"
            />
          ) : (
            <Upload size={18} />
          )}

          {analyzing
            ? 'Analizando archivo...'
            : 'Seleccionar Excel'}
        </button>

        <small>
          Formatos permitidos: XLSX, XLS, XLSM y CSV.
        </small>
      </div>

      {!!error && (
        <div
          className="panel"
          style={{
            marginTop: 18,
            borderColor: '#efcaca'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start'
            }}
          >
            <AlertTriangle
              size={20}
              color="#d64545"
            />

            <div>
              <strong>No se pudo procesar el archivo</strong>
              <p className="muted">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!!success && (
        <div
          className="panel"
          style={{
            marginTop: 18,
            borderColor: '#cfe9da'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start'
            }}
          >
            <CheckCircle2
              size={21}
              color="#198754"
            />

            <div>
              <strong>Importación completada</strong>

              <p className="muted">
                {success.created || 0} nuevas ·{' '}
                {success.updated || 0} actualizadas ·{' '}
                {success.unchanged || 0} sin cambios ·{' '}
                {success.excluded || 0} excluidas ·{' '}
                {success.review || 0} para revisión
              </p>
            </div>
          </div>
        </div>
      )}

      {!!preview && (
        <section
          className="panel"
          style={{ marginTop: 18 }}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Vista previa
              </p>

              <h2>
                {selectedFile?.name ||
                  preview.fileName}
              </h2>
            </div>

            <button
              type="button"
              className="ghost-btn"
              disabled={importing}
              onClick={resetSelection}
            >
              <X size={17} />
              Cancelar
            </button>
          </div>

          <div
            className="tournament-kpi-grid"
            style={{ marginTop: 18 }}
          >
            <article className="tournament-kpi-card income">
              <small>Nuevas</small>
              <strong>{preview.newCount}</strong>
            </article>

            <article className="tournament-kpi-card utility">
              <small>Actualizadas</small>
              <strong>{preview.updatedCount}</strong>
            </article>

            <article className="tournament-kpi-card current">
              <small>Sin cambios</small>
              <strong>{preview.unchangedCount}</strong>
            </article>

            <article className="tournament-kpi-card expense">
              <small>Con novedad</small>
              <strong>
                {preview.invalidRows +
                  preview.reviewCount}
              </strong>
            </article>
          </div>

          <div className="tournament-comparison-list">
            <div>
              <span>Filas leídas</span>
              <strong>{preview.totalRows}</strong>
            </div>

            <div>
              <span>Registros válidos únicos</span>
              <strong>{preview.validRows}</strong>
            </div>

            <div>
              <span>Duplicados dentro del archivo</span>
              <strong>
                {preview.duplicatesInFile}
              </strong>
            </div>

            <div>
              <span>Parejas excluidas manualmente</span>
              <strong>
                {preview.excludedCount}
              </strong>
            </div>

            <div>
              <span>Filas inválidas</span>
              <strong>{preview.invalidRows}</strong>
            </div>

            <div>
              <span>Requieren revisión</span>
              <strong>{preview.reviewCount}</strong>
            </div>
          </div>

          {!!readResult?.invalidRows?.length && (
            <details style={{ marginTop: 16 }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                Ver filas con errores
              </summary>

              <div
                className="tournament-import-history"
                style={{ marginTop: 10 }}
              >
                {readResult.invalidRows
                  .slice(0, 20)
                  .map((item) => (
                    <article key={item.rowNumber}>
                      <strong>
                        Fila {item.rowNumber}
                      </strong>

                      <span>
                        {item.errors.join(' ')}
                      </span>
                    </article>
                  ))}
              </div>
            </details>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={
                importing ||
                preview.newCount +
                  preview.updatedCount ===
                  0
              }
              onClick={confirmImport}
            >
              {importing ? (
                <LoaderCircle
                  size={18}
                  className="loader-icon"
                />
              ) : (
                <RefreshCw size={18} />
              )}

              {importing
                ? 'Guardando...'
                : 'Confirmar importación'}
            </button>

            <button
              type="button"
              className="ghost-btn"
              disabled={importing}
              onClick={resetSelection}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {!!tournamentImports.length && (
        <div className="tournament-import-history">
          <h3>Historial de sincronización</h3>

          {tournamentImports.map((item) => (
            <article key={item.id}>
              <strong>
                {item.fileName ||
                  'Archivo importado'}
              </strong>

              <span>
                {formatImportDate(item.createdAt)} ·{' '}
                {item.created || 0} nuevas ·{' '}
                {item.updated || 0} actualizadas ·{' '}
                {item.unchanged || 0} sin cambios ·{' '}
                {item.excluded || 0} excluidas
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

