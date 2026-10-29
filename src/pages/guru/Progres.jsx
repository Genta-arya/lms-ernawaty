import React, { useState, useEffect } from "react"
import { getKelasList } from "@/services/kelas"
import { getMateriList } from "@/services/materi"
import { getMuridList } from "@/services/murid"
import { getAllProgres } from "@/services/progres"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProgresSkeleton } from "@/components/ui/loading-skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { BarChart3, CheckCircle2 } from "lucide-react"

export function Progres() {
  const [kelasList, setKelasList] = useState([])
  const [materiList, setMateriList] = useState([])
  const [muridList, setMuridList] = useState([])
  const [progresList, setProgresList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [kelas, materi, murid, prog] = await Promise.all([
          getKelasList(),
          getMateriList(true),
          getMuridList(),
          getAllProgres(),
        ])
        setKelasList(kelas)
        setMateriList(materi)
        setMuridList(murid)
        setProgresList(prog)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Mapping murid ke kelas
  const muridToKelasMap = new Map()
  muridList.forEach((m) => muridToKelasMap.set(m.nisn, m.kelasId))

  // Hitung jumlah murid per kelas
  const muridCountPerKelas = new Map()
  muridList.forEach((m) => {
    if (m.kelasId) {
      muridCountPerKelas.set(m.kelasId, (muridCountPerKelas.get(m.kelasId) || 0) + 1)
    }
  })

  // Matriks: kelasId -> materiId -> jumlahMuridSelesai
  const matrix = new Map()
  progresList.forEach((p) => {
    if (p.selesai && p.nisn) {
      const kelasId = muridToKelasMap.get(p.nisn)
      if (kelasId) {
        if (!matrix.has(kelasId)) {
          matrix.set(kelasId, new Map())
        }
        const kelasMateriMap = matrix.get(kelasId)
        kelasMateriMap.set(p.materiId, (kelasMateriMap.get(p.materiId) || 0) + 1)
      }
    }
  })

  if (loading) {
    return <ProgresSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matriks Progres Membaca</h1>
        <p className="text-sm text-muted-foreground">
          Pantau jumlah siswa di setiap kelas yang telah membaca dan menuntaskan materi pembelajaran.
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Kelas</TableHead>
                <TableHead className="w-24">Total Siswa</TableHead>
                {materiList.map((m) => (
                  <TableHead key={m.id} className="text-center min-w-[160px]">
                    <div className="font-semibold text-xs text-foreground line-clamp-1">{m.judul}</div>
                    <span className="text-[10px] text-muted-foreground uppercase font-normal">{m.status}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelasList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={materiList.length + 2} className="text-center py-8 text-xs text-muted-foreground">
                    Belum ada kelas terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                kelasList.map((k) => {
                  const totalSiswaKelas = muridCountPerKelas.get(k.id) || 0
                  const kMap = matrix.get(k.id) || new Map()

                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-bold text-xs text-foreground">
                        Kelas {k.nama}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {totalSiswaKelas} Siswa
                      </TableCell>
                      {materiList.map((m) => {
                        const selesaiCount = kMap.get(m.id) || 0
                        const persen = totalSiswaKelas > 0 ? Math.round((selesaiCount / totalSiswaKelas) * 100) : 0

                        return (
                          <TableCell key={m.id} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold text-xs">
                                {selesaiCount} / {totalSiswaKelas}
                              </span>
                              <div className="w-20 bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-primary h-full transition-all"
                                  style={{ width: `${persen}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{persen}% Selesai</span>
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

