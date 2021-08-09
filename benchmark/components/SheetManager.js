export class SheetManager {
    static getFormat() {
        const formats = [...document.querySelectorAll('[name="download-format"]')];
        return formats.find(el => el.checked)?.value;
    }

    static generate(data) {
        if (data === null) return;
    
        const date = data.date ?? new Date();
    
        const aoa = [
            [
                'Tool', 
                data.testType !== null ? 'Test Type' : null,
                'Record Size', 
                'Date',
                ...(data.data[0].bandwidth ? [`Reads (${data.data[0].bwUnit})`, `Writes (${data.data[0].bwUnit})`, `Random Reads (${data.data[0].bwUnit})`, `Random Writes (${data.data[0].bwUnit})`] : []),
                ...(data.data[0].iops ? [`Reads (IOPS)`, `Writes (IOPS)`, `Random Reads (IOPS)`, `Random Writes (IOPS)`] : []),
            ].filter(x => x !== null),
            ...data.data.map(x => [
                data.tool,
                data.testType ?? null,
                x.recordSize,
                x.date.toLocaleString(),
                x.bandwidth?.[0],
                x.bandwidth?.[1],
                x.bandwidth?.[2],
                x.bandwidth?.[3],
                x.iops?.[0],
                x.iops?.[1],
                x.iops?.[2],
                x.iops?.[3],
            ].filter(x => (x ?? null) !== null)),
        ];
    
        const wb = XLSX.utils.book_new();
    
        const ws = XLSX.utils.aoa_to_sheet(aoa);
    
        XLSX.utils.book_append_sheet(wb, ws, 'Benchmarks');
    
        const dateFormatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
        const timeFormatted = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${date.getTime()}`;

        XLSX.writeFile(wb, 
            `benchmark-${data.tool}-${data.testType}-${dateFormatted}-${timeFormatted}.${SheetManager.getFormat()}`
        );
    }
}