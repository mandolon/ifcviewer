import React, { useState } from 'react';
import './FileUploadPanel.css';
import { parseE57File, validateE57File, validateFileSize } from '../utils/e57Parser';
import { generateSampleProjectData } from '../utils/sampleDataGenerator';

export default function FileUploadPanel({
  onPointCloudLoaded,
  onMetadataLoaded,
  onPanoramasLoaded,
  onError,
  error
}) {
  const [e57File, setE57File] = useState(null);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [fileSizeWarning, setFileSizeWarning] = useState(null);

  const handleE57Upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset warnings
    setFileSizeWarning(null);

    // Validate file extension
    if (!validateE57File(file)) {
      onError('Please select a valid E57 file');
      return;
    }

    // Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      onError(sizeValidation.error);
      return;
    }

    // Show warning for large files
    if (sizeValidation.warning) {
      setFileSizeWarning(sizeValidation.warning);
    }

    setE57File(file);
    setIsLoadingFile(true);
    setParsingProgress(0);
    setParsingStatus('Starting E57 parsing...');

    try {
      console.log('Starting E57 file parsing...', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Parse E57 file
      const result = await parseE57File(file, (progress) => {
        setParsingProgress(progress);

        if (progress < 20) {
          setParsingStatus('Reading E57 file...');
        } else if (progress < 30) {
          setParsingStatus('Processing file chunks...');
        } else if (progress < 60) {
          setParsingStatus('Converting E57 format (this may take a while)...');
        } else if (progress < 80) {
          setParsingStatus('Extracting point cloud...');
        } else if (progress < 95) {
          setParsingStatus('Extracting panoramic images...');
        } else {
          setParsingStatus('Finalizing...');
        }
      });

      setParsingStatus('Processing complete!');

      // Pass extracted data to parent components
      if (result.pointCloudData) {
        onPointCloudLoaded(result.pointCloudData);
      }

      if (result.scanMetadata) {
        onMetadataLoaded(result.scanMetadata);
      }

      if (result.panoramaBlobs) {
        onPanoramasLoaded(result.panoramaBlobs);
      }

      setIsLoadingFile(false);
      setParsingProgress(100);
    } catch (err) {
      console.error('E57 parsing error:', err);
      onError(`Failed to parse E57 file: ${err.message}`);
      setIsLoadingFile(false);
      setParsingProgress(0);
      setParsingStatus('');
    }
  };

  const handleLoadSampleData = async () => {
    setIsLoadingSample(true);
    setParsingStatus('Generating sample data...');

    try {
      const sampleData = await generateSampleProjectData();

      // Set a fake file name
      setE57File({ name: 'sample_project.e57', size: 1024000 });
      setParsingProgress(100);
      setParsingStatus('Sample data loaded!');

      // Pass sample data to parent
      onPointCloudLoaded(sampleData.pointCloudData);
      onMetadataLoaded(sampleData.scanMetadata);
      onPanoramasLoaded(sampleData.panoramaBlobs);

      setIsLoadingSample(false);
    } catch (err) {
      console.error('Error loading sample data:', err);
      onError(`Failed to load sample data: ${err.message}`);
      setIsLoadingSample(false);
    }
  };

  const allFilesLoaded = e57File && parsingProgress === 100;

  return (
    <div className="file-upload-panel">
      <div className="file-upload-container">
        <h1 className="upload-title">Load E57 Point Cloud Project</h1>
        <p className="upload-subtitle">
          Upload your Leica BLK360 E57 file to automatically extract point clouds, scan locations, and panoramic images
        </p>

        {error && (
          <div className="upload-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {fileSizeWarning && (
          <div className="upload-warning">
            <strong>⚠ Warning:</strong> {fileSizeWarning}
          </div>
        )}

        <div className="upload-main">
          <div className={`upload-step ${e57File ? 'completed' : ''}`}>
            <div className="step-content-large">
              <div className="upload-icon">📦</div>
              <h3>Select E57 File</h3>
              <p>Choose your exported E57 project file from Leica Register 360</p>

              {!e57File && !isLoadingSample && (
                <>
                  <label className="file-input-label-large">
                    <input
                      type="file"
                      accept=".e57"
                      onChange={handleE57Upload}
                      disabled={isLoadingFile}
                    />
                    <span className="file-button-large">
                      Browse Files
                    </span>
                  </label>

                  <div className="or-divider">or</div>

                  <button
                    className="sample-data-button"
                    onClick={handleLoadSampleData}
                    disabled={isLoadingFile || isLoadingSample}
                  >
                    Load Sample Data (for testing)
                  </button>
                </>
              )}

              {isLoadingSample && (
                <div className="loading-sample">
                  <div className="loading-spinner-small"></div>
                  <div className="loading-text">Generating sample data...</div>
                </div>
              )}

              {e57File && (
                <div className="file-info">
                  <div className="file-selected-large">
                    <span className="file-icon">✓</span>
                    <span className="file-name">{e57File.name}</span>
                    <span className="file-size">
                      ({(e57File.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>

                  {isLoadingFile && (
                    <div className="parsing-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${parsingProgress}%` }}
                        />
                      </div>
                      <div className="progress-info">
                        <span className="progress-status">{parsingStatus}</span>
                        <span className="progress-percent">{parsingProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {allFilesLoaded && (
          <div className="upload-complete">
            <div className="complete-icon">✓</div>
            <h3>E57 file processed successfully!</h3>
            <p>Loading viewer...</p>
          </div>
        )}

        <div className="upload-help">
          <h4>How to export E57 from Leica Register 360:</h4>
          <ol>
            <li>Open your project in Leica Register 360</li>
            <li>Select <strong>File → Export → E57</strong></li>
            <li>Ensure <strong>"Include Images"</strong> is checked</li>
            <li>Export the .e57 file</li>
            <li>Upload the file here</li>
          </ol>
          <div className="help-note">
            <strong>Note:</strong> E57 files contain point clouds, scan locations, and panoramic images in a single file.
          </div>
          <div className="help-note help-note-warning">
            <strong>⚠ File Size Limits:</strong> Browser memory limits restrict file processing to <strong>2GB maximum</strong>. Files larger than 500MB may fail or take several minutes to process. If your file is too large:
            <ul>
              <li>Reduce point cloud density in Leica Register 360</li>
              <li>Export fewer scans per file</li>
              <li>Use point cloud decimation/downsampling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
