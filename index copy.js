const ELEMENT_TYPES = {
    Panel: {
        components: ['RectTransform', 'Image'],
        properties: {
            color: { type: 'color', label: 'Background Color' }
        }
    },
    Label: {
        components: ['RectTransform', 'Text'],
        properties: {
            text: { type: 'text', label: 'Text' },
            fontSize: { type: 'number', label: 'Font Size', default: 14 },
            align: { type: 'select', label: 'Text Align', options: ['UpperLeft', 'UpperCenter', 'UpperRight', 'MiddleLeft', 'MiddleCenter', 'MiddleRight', 'LowerLeft', 'LowerCenter', 'LowerRight'] },
            color: { type: 'color', label: 'Text Color' }
        }
    },
    Button: {
        components: ['RectTransform', 'Button', 'Text'],
        properties: {
            text: { type: 'text', label: 'Text' },
            fontSize: { type: 'number', label: 'Font Size', default: 14 },
            command: { type: 'text', label: 'Command' },
            close: { type: 'text', label: 'Close' },
            backgroundColor: { type: 'color', label: 'Background Color' },
            textColor: { type: 'color', label: 'Text Color' }
        }
    },
    RawImage: {
        components: ['RectTransform', 'RawImage'],
        properties: {
            url: { type: 'text', label: 'Image URL' },
            color: { type: 'color', label: 'Tint Color' }
        }
    },
    InputField: {
        components: ['RectTransform', 'InputField'],
        properties: {
            text: { type: 'text', label: 'Placeholder' },
            fontSize: { type: 'number', label: 'Font Size', default: 14 },
            align: { type: 'select', label: 'Text Align', options: ['UpperLeft', 'UpperCenter', 'UpperRight', 'MiddleLeft', 'MiddleCenter', 'MiddleRight', 'LowerLeft', 'LowerCenter', 'LowerRight'] },
            color: { type: 'color', label: 'Text Color' },
            characterLimit: { type: 'number', label: 'Character Limit', default: 100 },
            command: { type: 'text', label: 'Command' }
        }
    }
};

function RenameModal({ isOpen, onClose, initialValue, onRename }) {
    const [value, setValue] = React.useState(initialValue);
    
    React.useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Rename Element</h3>
                <input
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            onRename(value);
                            onClose();
                        } else if (e.key === 'Escape') {
                            onClose();
                        }
                    }}
                    autoFocus
                />
                <div className="modal-actions">
                    <button onClick={() => {
                        onRename(value);
                        onClose();
                    }}>Rename</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [color, setColor] = React.useState('#ffffff');
    const [recentColors, setRecentColors] = React.useState(['#ffffff']);
    const colorPickerRef = React.useRef(null);
    const colorPickerInstance = React.useRef(null);
    const [uiElements, setUiElements] = React.useState([]);
    const [snippet, setSnippet] = React.useState("");
    const [selectedElementId, setSelectedElementId] = React.useState(null);
    const [dragInfo, setDragInfo] = React.useState(null);
    const [renameModal, setRenameModal] = React.useState({ open: false, elementId: null });
    const [opacity, setOpacity] = React.useState(1);
    const [brightness, setBrightness] = React.useState(1);
    const [draggedElement, setDraggedElement] = React.useState(null);
    const [dragOverElement, setDragOverElement] = React.useState(null);
    
    // Add new state for preview container dimensions
    const [previewDimensions, setPreviewDimensions] = React.useState({ width: 0, height: 0 });
    const previewContainerRef = React.useRef(null);

    // Add resize handler
    const updatePreviewDimensions = React.useCallback(() => {
        if (previewContainerRef.current) {
            const rect = previewContainerRef.current.getBoundingClientRect();
            setPreviewDimensions({ width: rect.width, height: rect.height });
        }
    }, []);

    // Add resize effect
    React.useEffect(() => {
        updatePreviewDimensions();
        window.addEventListener('resize', updatePreviewDimensions);
        return () => window.removeEventListener('resize', updatePreviewDimensions);
    }, [updatePreviewDimensions]);
    
    const addRecentColor = (newColor) => {
        setRecentColors(prev => {
            const filtered = prev.filter(c => c !== newColor);
            return [newColor, ...filtered].slice(0, 8);
        });
    };

    const invertColor = (hex) => {
        const hex_no_hash = hex.replace('#', '');
        const rgb = parseInt(hex_no_hash, 16);
        const r = (rgb >> 16) & 0xFF;
        const g = (rgb >> 8) & 0xFF;
        const b = rgb & 0xFF;
        return `#${((0xFFFFFF ^ (r << 16 | g << 8 | b))).toString(16).padStart(6, '0')}`;
    };

    const initColorPicker = React.useCallback(() => {
        if (colorPickerRef.current && !colorPickerInstance.current) {
            const wheelSize = 150;
            colorPickerInstance.current = new iro.ColorPicker(colorPickerRef.current, {
                width: wheelSize,
                layoutDirection: 'horizontal',
                layout: [
                    { 
                        component: iro.ui.Wheel,
                        options: {
                            wheelLightness: false,
                            wheelAngle: 0,
                            wheelDirection: 'clockwise'
                        }
                    }
                ]
            });

            colorPickerInstance.current.on('color:change', (color) => {
                setColor(color.hexString);
            });

            colorPickerInstance.current.on('input:end', (color) => {
                addRecentColor(color.hexString);
            });
        }
    }, []);

    const handleBrightnessChange = (e) => {
        const value = parseFloat(e.target.value);
        setBrightness(value);
        if (colorPickerInstance.current) {
            const color = colorPickerInstance.current.color;
            color.value = value * 100; // IroJS uses 0-100 for value
        }
    };

    React.useEffect(() => {
        initColorPicker();
        
        return () => {
            if (colorPickerInstance.current) {
                colorPickerInstance.current.off('color:change');
                colorPickerInstance.current.off('input:end');
                colorPickerInstance.current = null;
            }
        };
    }, [initColorPicker]);

    const compileUI = () => {
        const lines = uiElements.map(elem => {
            const typeConfig = ELEMENT_TYPES[elem.type];
            const components = [];

            // Add RectTransform
            components.push(`RectTransform = { AnchorMin = "${elem.anchorMin}", AnchorMax = "${elem.anchorMax}" }`);

            // Add type-specific components
            typeConfig.components.forEach(comp => {
                switch(comp) {
                    case 'Image':
                        components.push(`Image = { Color = "${elem.color}" }`);
                        break;
                    case 'RawImage':
                        components.push(`RawImage = { Color = "${elem.color}", Url = "${elem.url}" }`);
                        break;
                    case 'Text':
                        components.push(`Text = { 
                            Text = "${elem.text}", 
                            FontSize = ${elem.fontSize},
                            Align = ${elem.align || 'MiddleCenter'},
                            Color = "${elem.color}"
                        }`);
                        break;
                    case 'Button':
                        components.push(`Button = { 
                            Command = "${elem.command}",
                            Close = "${elem.close}",
                            Color = "${elem.backgroundColor}"
                        }`);
                        components.push(`Text = {
                            Text = "${elem.text}",
                            FontSize = ${elem.fontSize},
                            Align = ${elem.align || 'MiddleCenter'},
                            Color = "${elem.textColor}"
                        }`);
                        break;
                    case 'InputField':
                        components.push(`InputField = { 
                            Text = "${elem.text}",
                            FontSize = ${elem.fontSize},
                            Align = ${elem.align || 'MiddleLeft'},
                            CharacterLimit = ${elem.characterLimit},
                            Command = "${elem.command}",
                            Color = "${elem.color}"
                        }`);
                        break;
                }
            });

            return `
    container.Add(new Cui${elem.type} {
        ${components.join(',\n        ')}
    }, "Overlay", "${elem.name}");`;
        });

        const generated = `using Oxide.Game.Rust.Cui;

[ConsoleCommand("myplugin.compileui")]
private void cmdCompileUI(ConsoleSystem.Arg arg)
{
    var player = arg.Player();
    var container = new CuiElementContainer();
    ${lines.join("")}
    CuiHelper.AddUi(player, container);
}`;
        setSnippet(generated);
    };

    const addElement = (type) => {
        const typeConfig = ELEMENT_TYPES[type];
        const properties = {};
        
        // Initialize default properties based on type
        Object.entries(typeConfig.properties).forEach(([key, config]) => {
            properties[key] = config.default || (
                config.type === 'color' ? '1.0 1.0 1.0 1.0' :
                config.type === 'text' ? '' :
                config.type === 'number' ? 0 :
                config.type === 'select' ? config.options[0] : ''
            );
        });

        const newElem = {
            id: Date.now().toString(),
            name: `New ${type}`,
            type,
            parentId: selectedElementId,
            anchorMin: "0.3 0.3",  // Changed default position
            anchorMax: "0.7 0.7",  // Changed default position
            ...properties
        };
        
        setUiElements(prev => [...prev, newElem]);
        setSelectedElementId(newElem.id);
    };

    const handleRename = (elementId, newName) => {
        setUiElements(prev => prev.map(el => {
            if (el.id === elementId) {
                return { ...el, name: newName };
            }
            return el;
        }));
    };

    const updateSelectedElement = (prop, value) => {
        setUiElements(prev => prev.map(el => {
            if (el.id === selectedElementId) {
                return { ...el, [prop]: value };
            }
            return el;
        }));
    };

    const convertHexToRustColor = (hex, opacityValue = opacity) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return `${r.toFixed(1)} ${g.toFixed(1)} ${b.toFixed(1)} ${opacityValue.toFixed(1)}`;
    };

    const handleMouseDown = (e, element, action) => {
        e.stopPropagation();
        const rect = previewContainerRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const [startMinX, startMinY] = element.anchorMin.split(' ').map(Number);
        const [startMaxX, startMaxY] = element.anchorMax.split(' ').map(Number);
        
        setDragInfo({
            elementId: element.id,
            action,
            startX,
            startY,
            startMinX,
            startMinY,
            startMaxX,
            startMaxY
        });
    };

    // Update handleMouseMove for proper anchor calculations
    const handleMouseMove = React.useCallback((e) => {
        if (!dragInfo || !previewContainerRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const rect = previewContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Invert Y coordinate (1 at bottom, 0 at top)
        const rustY = mouseY / rect.height;
        const startRustY = (dragInfo.startY - rect.top) / rect.height;
        
        // Calculate deltas, Y is now inverted
        const dx = (mouseX - (dragInfo.startX - rect.left)) / rect.width;
        const dy = -(rustY - startRustY); // Negative to invert the direction

        setUiElements(elements => elements.map(el => {
            if (el.id !== dragInfo.elementId) return el;

            let newMinX = dragInfo.startMinX;
            let newMinY = dragInfo.startMinY;
            let newMaxX = dragInfo.startMaxX;
            let newMaxY = dragInfo.startMaxY;

            switch (dragInfo.action) {
                case 'move':
                    newMinX += dx;
                    newMaxX += dx;
                    newMinY += dy;
                    newMaxY += dy;
                    break;
                case 'nw':
                    newMinX += dx;
                    newMinY += dy;
                    break;
                case 'ne':
                    newMaxX += dx;
                    newMinY += dy;
                    break;
                case 'sw':
                    newMinX += dx;
                    newMaxY += dy;
                    break;
                case 'se':
                    newMaxX += dx;
                    newMaxY += dy;
                    break;
            }

            // Ensure coordinates stay within 0-1 range
            newMinX = Math.max(0, Math.min(1, newMinX));
            newMinY = Math.max(0, Math.min(1, newMinY));
            newMaxX = Math.max(0, Math.min(1, newMaxX));
            newMaxY = Math.max(0, Math.min(1, newMaxY));

            return {
                ...el,
                anchorMin: `${newMinX.toFixed(6)} ${newMinY.toFixed(6)}`,
                anchorMax: `${newMaxX.toFixed(6)} ${newMaxY.toFixed(6)}`
            };
        }));
    }, [dragInfo]);

    const handleMouseUp = React.useCallback(() => {
        setDragInfo(null);
    }, []);

    React.useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const handleKeyDown = React.useCallback((e) => {
        if (e.key === 'Delete' && selectedElementId) {
            setUiElements(prev => prev.filter(el => {
                // Remove the selected element and all its children recursively
                const isChild = (parentId) => {
                    return prev.some(element => 
                        element.parentId === parentId && 
                        (element.id === el.id || isChild(element.id))
                    );
                };
                return el.id !== selectedElementId && !isChild(selectedElementId);
            }));
            setSelectedElementId(null);
        }
    }, [selectedElementId]);

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const renderHierarchy = (parentId = null, depth = 0) => {
        const elements = uiElements.filter(el => el.parentId === parentId);
        
        return elements.map(element => {
            const canAcceptChildren = element.type === 'Panel';
            const isDragging = draggedElement === element.id;
            const isOver = dragOverElement === element.id;
            
            return (
                <React.Fragment key={element.id}>
                    <div 
                        className={`hierarchy-item ${selectedElementId === element.id ? 'selected' : ''} 
                                  ${isDragging ? 'dragging' : ''} 
                                  ${isOver && canAcceptChildren ? 'drop-target' : ''}`}
                        style={{ paddingLeft: `${depth * 20}px` }}
                        onClick={() => setSelectedElementId(element.id)}
                        onDoubleClick={() => {
                            setRenameModal({
                                open: true,
                                elementId: element.id,
                                initialValue: element.name
                            });
                        }}
                        draggable
                        onDragStart={(e) => {
                            setDraggedElement(element.id);
                            e.stopPropagation();
                        }}
                        onDragOver={(e) => {
                            if (canAcceptChildren) {
                                e.preventDefault();
                                setDragOverElement(element.id);
                            }
                        }}
                        onDragEnd={() => {
                            setDraggedElement(null);
                            setDragOverElement(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (draggedElement && canAcceptChildren) {
                                setUiElements(prev => prev.map(el => 
                                    el.id === draggedElement ? 
                                        { ...el, parentId: element.id } : 
                                        el
                                ));
                            }
                            setDraggedElement(null);
                            setDragOverElement(null);
                        }}
                    >
                        {element.name}
                    </div>
                    {renderHierarchy(element.id, depth + 1)}
                </React.Fragment>
            );
        });
    };

    // Update calculatePosition to handle Rust coordinates
    const calculatePosition = (element) => {
        const [minX, minY] = element.anchorMin.split(' ').map(Number);
        const [maxX, maxY] = element.anchorMax.split(' ').map(Number);
        
        return {
            left: `${minX * 100}%`,
            top: `${(1 - maxY) * 100}%`,  // Invert Y coordinates
            width: `${(maxX - minX) * 100}%`,
            height: `${(maxY - minY) * 100}%`
        };
    };

    // Update renderElement style to use bottom positioning
    const renderElement = (element) => {
        const position = calculatePosition(element);
        const elementType = ELEMENT_TYPES[element.type];
        const hasText = elementType.components.includes('Text');
        const isButton = element.type === 'Button';
        const hasBackground = element.type === 'Panel' || isButton;
        
        return (
            <div
                key={element.id}
                className={`ui-element ${selectedElementId === element.id ? 'selected' : ''}`}
                style={{
                    position: 'absolute',
                    ...position,
                    bottom: 'auto', // Remove bottom positioning
                    backgroundColor: hasBackground ? 
                        parseRustColorToRgba(isButton ? element.backgroundColor : element.color) : 
                        'transparent',
                    color: hasText ? 
                        parseRustColorToRgba(isButton ? element.textColor : element.color) : 
                        undefined,
                    fontSize: hasText ? `${element.fontSize}px` : undefined
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(element.id);
                }}
                onMouseDown={(e) => handleMouseDown(e, element, 'move')}
            >
                {hasText && element.text}
                {selectedElementId === element.id && (
                    <React.Fragment>
                        <div className="resize-handle nw" onMouseDown={(e) => handleMouseDown(e, element, 'nw')} />
                        <div className="resize-handle ne" onMouseDown={(e) => handleMouseDown(e, element, 'ne')} />
                        <div className="resize-handle sw" onMouseDown={(e) => handleMouseDown(e, element, 'sw')} />
                        <div className="resize-handle se" onMouseDown={(e) => handleMouseDown(e, element, 'se')} />
                    </React.Fragment>
                )}
            </div>
        );
    };

    const parseRustColorToRgba = (rustColor) => {
        if (!rustColor) return 'transparent';
        const [r, g, b, a] = rustColor.split(' ').map(Number);
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    };

    const selectedEl = uiElements.find(el => el.id === selectedElementId) || {};

    return (
        <div className="app">
            <div className="background-container" onClick={() => setSelectedElementId(null)} />
            <div className="element-preview-container" ref={previewContainerRef}>
                {uiElements.map(element => renderElement(element))}
            </div>
            <div className="right-panel">
                <div className="element-buttons">
                    <button className="element-button" onClick={() => addElement('Panel')}>Add Panel</button>
                    <button className="element-button" onClick={() => addElement('Label')}>Add Label</button>
                    <button className="element-button" onClick={() => addElement('Button')}>Add Button</button>
                    <button className="element-button" onClick={() => addElement('InputField')}>Add Input</button>
                    <button className="element-button" onClick={() => addElement('RawImage')}>Add Image</button>
                </div>
                
                <div className="scene-hierarchy">
                    <label>Scene Hierarchy</label>
                    {renderHierarchy()}
                </div>

                {selectedElementId && (
                    <div className="property-editor">
                        <label>Element Name</label>
                        <input
                            type="text"
                            value={selectedEl.name || ""}
                            onChange={e => updateSelectedElement("name", e.target.value)}
                        />
                        <label>Anchor Min</label>
                        <input
                            type="text"
                            value={selectedEl.anchorMin || ""}
                            onChange={e => updateSelectedElement("anchorMin", e.target.value)}
                        />
                        <label>Anchor Max</label>
                        <input
                            type="text"
                            value={selectedEl.anchorMax || ""}
                            onChange={e => updateSelectedElement("anchorMax", e.target.value)}
                        />
                        
                        {Object.entries(ELEMENT_TYPES[selectedEl.type].properties).map(([key, config]) => (
                            <React.Fragment key={key}>
                                <label>{config.label}</label>
                                {config.type === 'select' ? (
                                    <select
                                        value={selectedEl[key] || ''}
                                        onChange={e => updateSelectedElement(key, e.target.value)}
                                    >
                                        {config.options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={config.type === 'number' ? 'number' : 'text'}
                                        value={selectedEl[key] || ''}
                                        onChange={e => updateSelectedElement(key, config.type === 'number' ? 
                                            Number(e.target.value) : e.target.value)}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <div className="color-picker-container">
                    <label className="color-picker-label">Color Picker</label>
                    <div className="picker-wrapper">
                        <div ref={colorPickerRef}></div>
                        <div className="brightness-slider">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={brightness}
                                onChange={handleBrightnessChange}
                            />
                        </div>
                    </div>
                    <div className="opacity-slider">
                        <label>Opacity: {opacity.toFixed(2)}</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="recent-colors">
                        <label className="color-picker-label">Recent Colors</label>
                        <div className="color-swatches">
                            {recentColors.map((c, i) => (
                                <div
                                    key={i}
                                    className="color-swatch"
                                    style={{ backgroundColor: c }}
                                    onClick={() => {
                                        setColor(c);
                                        if (colorPickerInstance.current) {
                                            colorPickerInstance.current.color.hexString = c;
                                        }
                                    }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                    {selectedElementId && (
                        <div className="color-actions">
                            <button 
                                className="color-action-button"
                                onClick={() => handleColorApply('background')}
                            >
                                Set Background
                            </button>
                            <button 
                                className="color-action-button"
                                onClick={() => handleColorApply('text')}
                            >
                                Set Text Color
                            </button>
                        </div>
                    )}
                </div>

                <div className="compiler-container">
                    <label>Compiler Output</label>
                    <button className="compile-button" onClick={compileUI}>
                        Compile to C#
                    </button>
                    <textarea
                        className="snippet-output"
                        value={snippet}
                        readOnly
                    />
                </div>
            </div>
            <RenameModal
                isOpen={renameModal.open}
                initialValue={(uiElements.find(el => el.id === renameModal.elementId) || {}).name || ''}
                onClose={() => setRenameModal({ open: false, elementId: null })}
                onRename={(newName) => handleRename(renameModal.elementId, newName)}
            />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);