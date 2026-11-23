import { Fragment, useEffect, useReducer, useRef, useState } from 'react';
import { Editor } from './editor';
import type { LibraryDevice } from './devices';
import type { DeviceNodeData, DevicePort, PortDirection } from './definitions';

function mount(root: ParentNode, editor: Editor) {
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-avs-part="${name}"]`)!;
  editor.mount(part('surface'), part('palette'), part('controls'), part('miniview'));
  return () => editor.destroy();
}

export default function App({ url }: { url: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);
  const [editor] = useState(() => new Editor(refresh));

  useEffect(() => mount(root.current!, editor), [editor]);
  useEffect(() => {
    const request = new AbortController();
    void editor.loadDataset(url, request.signal);
    return () => request.abort();
  }, [editor, url]);

  function libraryItem(item: LibraryDevice, segments?: {text: string; match: boolean}[]) {
    return <>
      <button className={["vjs-avs-library-item", editor.dark && "dark"].filter(Boolean).join(' ')} type="button" data-vjs-type="device" data-library-id={item.libraryId} onClick={() => { editor.editTemplate(item.libraryId); refresh(); }}>
        <span className="vjs-avs-library-item-text">
          <strong>
            {segments ? <>
                {segments.map((segment, index) => <Fragment key={index}>{segment.match ? <>
                      <mark>
                        {segment.text}
                      </mark>
                    </> : <>
                      <span>
                        {segment.text}
                      </span>
                    </>}</Fragment>)}
              </> : <>
                 {item.template.manufacturer} {item.template.model} 
              </>}
          </strong>
          <small>
            {item.template.category}
          </small>
        </span>
        <svg className="icon drag-grip" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="4.5" r="1" />
          <circle cx="10" cy="4.5" r="1" />
          <circle cx="6" cy="8" r="1" />
          <circle cx="10" cy="8" r="1" />
          <circle cx="6" cy="11.5" r="1" />
          <circle cx="10" cy="11.5" r="1" />
        </svg>
      </button>
    </>;
  }

  function deviceForm(item: DeviceNodeData, template: boolean) {
    return <>
      <div className="field-group">
        {!template ? <>
            <label>
              Device ID 
              <input value={item.deviceId ?? ''} onChange={(event) => { editor.editDevice(item, {deviceId: event.currentTarget.value}); refresh(); }} />
            </label>
          </> : null}
        <label>
          Manufacturer 
          <input value={item.manufacturer ?? ''} onChange={(event) => { editor.editDevice(item, {manufacturer: event.currentTarget.value}); refresh(); }} />
        </label>
        <label>
          Model 
          <input value={item.model ?? ''} onChange={(event) => { editor.editDevice(item, {model: event.currentTarget.value}); refresh(); }} />
        </label>
        <label>
          Category 
          <input list="device-categories" value={item.category ?? ''} onChange={(event) => { editor.editDevice(item, {category: event.currentTarget.value}); refresh(); }} />
        </label>
        {!template ? <>
            <label>
              Location 
              <input value={item.location ?? ''} onChange={(event) => { editor.editDevice(item, {location: event.currentTarget.value}); refresh(); }} />
            </label>
          </> : null}
      </div>
      <h3 className="section-heading">
        Ports
      </h3>
      {template ? <>
          {portList(item, item.ports)}
          <button className="btn-full" type="button" onClick={() => { editor.addPort(item); refresh(); }}>
            <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
             Add port 
          </button>
        </> : <>
          <div className="port-tabs" role="tablist" aria-label="Port direction" onKeyDown={(event) => { editor.onPortTabKey(event); refresh(); }}>
            {editor.portTabs.map((direction) => <button key={direction} type="button" role="tab" id={'port-tab-' + direction} aria-selected={editor.activePortTab === direction} tabIndex={editor.activePortTab === direction ? 0 : -1} onClick={() => { editor.activePortTab = direction; refresh(); }}>
                <span>
                  {direction === 'input' ? 'Input ports' : 'Output ports'}
                </span>
                <span className="tab-count">
                  {editor.portsFor(item, direction).length}
                </span>
              </button>)}
          </div>
          {editor.portTabs.map((direction) => <div key={direction} role="tabpanel" id={'port-panel-' + direction} aria-labelledby={'port-tab-' + direction} hidden={editor.activePortTab !== direction}>
              {editor.activePortTab === direction ? <>
                  {portList(item, editor.portsFor(item, direction), direction)}
                </> : null}
            </div>)}
        </>}
    </>;
  }

  function portList(item: DeviceNodeData, ports: DevicePort[], direction?: PortDirection) {
    return <>
      <div className="port-cards">
        {ports.length ? ports.map((port, i, items) => {
          const last = i === items.length - 1;
          return <div key={port.id} className="port-card">
            <div className="port-row-top">
              <input aria-label="Port label" placeholder="Port label" value={port.label ?? ''} onChange={(event) => { editor.editPort(item, port, {label: event.currentTarget.value}); refresh(); }} />
              <select aria-label="Port direction" value={port.direction ?? ''} onChange={(event) => { editor.editPort(item, port, {direction: event.currentTarget.value as PortDirection}); refresh(); }}>
                <option value="input">
                  Input
                </option>
                <option value="output">
                  Output
                </option>
              </select>
            </div>
            <div className="port-row-bottom">
              <input list="connector-types" aria-label="Connector type" placeholder="Connector" value={port.connectorType ?? ''} onChange={(event) => { editor.editPort(item, port, {connectorType: event.currentTarget.value}); refresh(); }} />
              <div className="port-actions">
                <button className="btn-icon" type="button" aria-label="Move port up" title="Move up" disabled={i === 0} onClick={() => { editor.movePort(item, port, -1, direction); refresh(); }}>
                  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4 10 4-4 4 4" />
                  </svg>
                </button>
                <button className="btn-icon" type="button" aria-label="Move port down" title="Move down" disabled={last} onClick={() => { editor.movePort(item, port, 1, direction); refresh(); }}>
                  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </button>
                <button className="btn-icon btn-danger-ghost" type="button" aria-label="Remove port" title="Remove port" onClick={() => { editor.removePort(item, port); refresh(); }}>
                  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.7 8.5a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>;
        }) : <>
          <p className="empty-state">
            {direction ? 'No ' + direction + ' ports' : 'No ports'}
          </p>
        </>}
      </div>
    </>;
  }

  return <div ref={root}>
    <main className={["vjs-avs-container", editor.dark && "dark"].filter(Boolean).join(' ')}>
      <header className="vjs-avs-toolbar">
        <h1>
          AV Schematic
        </h1>
        <button type="button" aria-expanded={editor.libraryOpen} onClick={() => { editor.libraryOpen = !editor.libraryOpen; refresh(); }}>
          <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
            <path d="M6 2.5v11" />
          </svg>
           Library 
        </button>
        <button type="button" aria-expanded={editor.propertiesOpen} onClick={() => { editor.propertiesOpen = !editor.propertiesOpen; refresh(); }}>
          <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
            <path d="M10 2.5v11" />
          </svg>
           Properties 
        </button>
        <button type="button" onClick={() => { editor.toggleTheme(); refresh(); }}>
          {editor.dark ? <>
              <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
              </svg>
               Light theme 
            </> : <>
              <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13.5 9.8A5.5 5.5 0 0 1 6.2 2.5a5.5 5.5 0 1 0 7.3 7.3Z" />
              </svg>
               Dark theme 
            </>}
        </button>
        <button type="button" onClick={() => { editor.downloadDxf(); refresh(); }}>
          <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 2H4a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6L9.5 2Z" />
            <path d="M9.5 2v4h4" />
            <path d="M8 8.5v3.5m0 0-1.5-1.5M8 12l1.5-1.5" />
          </svg>
           Export DXF 
        </button>
      </header>
      <div className={["vjs-avs-workspace", !editor.libraryOpen && "vjs-avs-library-closed", !editor.propertiesOpen && "vjs-avs-properties-closed"].filter(Boolean).join(' ')}>
        <aside className="vjs-avs-pane vjs-avs-library-pane" hidden={!editor.libraryOpen}>
          <div className="vjs-avs-pane-header">
            <h2>
              Device library
            </h2>
            <div className="search-field">
              <svg className="icon search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" />
                <path d="m10.5 10.5 3 3" />
              </svg>
              <input type="search" placeholder="Search devices" aria-label="Search devices" value={editor.query ?? ''} onChange={(event) => { editor.query = event.currentTarget.value; refresh(); }} />
            </div>
            <button className="btn-primary btn-full" type="button" onClick={() => { editor.editTemplate(); refresh(); }}>
              <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
               Add template 
            </button>
          </div>
          <div className="vjs-avs-pane-body" data-avs-part="palette">
            {editor.draft ? <>
                <h3 className="section-heading">
                  {editor.draftId ? 'Edit template' : 'New template'}
                </h3>
                {deviceForm(editor.draft!, true)}
              </> : editor.searchQuery ? <>
                <div className="vjs-avs-library-items">
                  {editor.filteredLibrary.length ? editor.filteredLibrary.map((result) => <Fragment key={result.item.libraryId}>{libraryItem(result.item, result.segments)}</Fragment>) : <>
                    <p className="empty-state">
                      No matching devices
                    </p>
                  </>}
                </div>
              </> : <>
                {editor.libraryGroups.length ? editor.libraryGroups.map((group) => <details key={group.key} className="library-group" open={editor.isCategoryOpen(group.key)} onToggle={(event) => editor.setCategoryOpen(group.key, event.currentTarget.open)}>
                    <summary>
                      <span className="library-label">
                        {group.label}
                      </span>
                      <span className="library-count">
                        {group.items.length}
                      </span>
                    </summary>
                    <div className="vjs-avs-library-items">
                      {group.items.map((item) => <Fragment key={item.libraryId}>{libraryItem(item)}</Fragment>)}
                    </div>
                  </details>) : <>
                  <p className="empty-state">
                    No devices in library
                  </p>
                </>}
              </>}
          </div>
          {editor.draft ? <>
              <div className="vjs-avs-pane-footer">
                <button className="btn-primary" type="button" onClick={() => { editor.saveTemplate(); refresh(); }}>
                  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                   Save 
                </button>
                <button type="button" onClick={() => { editor.draft = null; refresh(); }}>
                  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                   Discard 
                </button>
                {editor.draftId ? <>
                    <button className="btn-danger" type="button" aria-label="Delete template" title="Delete template" onClick={() => { editor.deleteTemplate(); refresh(); }}>
                      <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.7 8.5a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8.5" />
                      </svg>
                    </button>
                  </> : null}
              </div>
            </> : null}
        </aside>
        <section className="vjs-avs-canvas">
          <div className="avs-surface" data-avs-part="surface" />
          <div data-avs-part="controls" />
          <div className="avs-miniview">
            <div data-avs-part="miniview" />
          </div>
        </section>
        <aside className="vjs-avs-pane vjs-avs-properties-pane" hidden={!editor.propertiesOpen}>
          <div className="vjs-avs-pane-header">
            <h2>
              Properties
            </h2>
          </div>
          <div className="avs-inspector">
            {editor.selectedDevice || editor.selectedCable ? <>
                <div className="vjs-avs-pane-body">
                  {editor.selectedDevice ? <>
                      {deviceForm(editor.selectedDevice!, false)}
                    </> : editor.selectedCable ? <>
                      <h3 className="section-heading">
                        Cable
                      </h3>
                      <div className="field-group">
                        <label>
                          Cable ID 
                          <input value={editor.selectedCable!.cableId ?? ''} onChange={(event) => { editor.editCable({cableId: event.currentTarget.value}); refresh(); }} />
                        </label>
                        <label>
                          Signal type 
                          <select value={editor.selectedCable!.cableType ?? ''} onChange={(event) => { editor.editCable({cableType: event.currentTarget.value || undefined}); refresh(); }}>
                            <option value="">
                              Unspecified
                            </option>
                            {editor.signalTypes.map((type) => <option key={type} value={type}>
                                {type}
                              </option>)}
                          </select>
                        </label>
                      </div>
                    </> : null}
                </div>
                {editor.selectedDevice ? <>
                    <div className="vjs-avs-pane-footer">
                      <button className="btn-primary" type="button" onClick={() => { editor.addPort(editor.selectedDevice!, editor.activePortTab); refresh(); }}>
                        <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                          <path d="M8 3.5v9M3.5 8h9" />
                        </svg>
                         Add {editor.activePortTab} port 
                      </button>
                      <button className="btn-danger" type="button" onClick={() => { editor.deleteDevice(); refresh(); }}>
                        <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.7 8.5a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8.5" />
                        </svg>
                         Delete device 
                      </button>
                    </div>
                  </> : editor.selectedCable ? <>
                    <div className="vjs-avs-pane-footer">
                      <button type="button" onClick={() => { editor.resetRouting(); refresh(); }}>
                        <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 7a5 5 0 1 1 1.5 3.6M3 3.5V7h3.5" />
                        </svg>
                         Reset routing 
                      </button>
                      <button className="btn-danger" type="button" onClick={() => { editor.deleteCable(); refresh(); }}>
                        <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.7 8.5a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8.5" />
                        </svg>
                         Delete cable 
                      </button>
                    </div>
                  </> : null}
              </> : <>
                <div className="vjs-avs-pane-body">
                  <p className="empty-state">
                    Select a device or cable on the canvas to inspect and edit its properties.
                  </p>
                </div>
              </>}
          </div>
        </aside>
      </div>
    </main>
    <datalist id="device-categories">
      {editor.deviceTypes.map((type) => <option key={type.name} value={type.name} />)}
    </datalist>
    <datalist id="connector-types">
      {editor.connectors.map((type) => <option key={type} value={type} />)}
    </datalist>
  </div>;
}
