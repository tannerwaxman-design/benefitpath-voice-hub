import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioLines, Search, BookOpen, Mic } from "lucide-react";
import { VoiceCard } from "@/components/voices/VoiceCard";
import { CloneVoiceTab } from "@/components/voices/CloneVoiceTab";
import {
  useMyVoices,
  useVoiceLibrary,
  useAddToCollection,
  useRemoveFromCollection,
  useSetDefaultVoice,
  useDeleteVoice,
} from "@/hooks/use-voice-management";
import { useNavigate } from "react-router-dom";

export default function Voices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my-voices");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");

  const { data: myVoices, isLoading: myLoading } = useMyVoices();
  const { data: libraryVoices, isLoading: libLoading } = useVoiceLibrary();
  const addToCollection = useAddToCollection();
  const removeFromCollection = useRemoveFromCollection();
  const setDefaultVoice = useSetDefaultVoice();
  const deleteVoice = useDeleteVoice();

  const filteredLibrary = (libraryVoices || []).filter((v) => {
    if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (genderFilter !== "all" && v.gender?.toLowerCase() !== genderFilter) return false;
    if (styleFilter !== "all" && !v.style?.toLowerCase().includes(styleFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <AudioLines className="h-6 w-6" />
          Voices
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse preset voices, clone your own, and test how they sound before using them on calls.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-voices">My Voices</TabsTrigger>
          <TabsTrigger value="library">Voice Library</TabsTrigger>
          <TabsTrigger value="clone">Clone My Voice</TabsTrigger>
        </TabsList>

        {/* MY VOICES */}
        <TabsContent value="my-voices" className="mt-6">
          {myLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : !myVoices || myVoices.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <AudioLines className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">You haven't added any voices yet.</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Browse the Voice Library to find a preset voice, or clone your own voice so the AI sounds like you.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setActiveTab("library")} className="gap-1">
                  <BookOpen className="h-4 w-4" /> Browse Library
                </Button>
                <Button onClick={() => setActiveTab("clone")} className="gap-1">
                  <Mic className="h-4 w-4" /> Clone My Voice
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  mode="my-voices"
                  onSetDefault={(id) => setDefaultVoice.mutate(id)}
                  onRemove={(id) => removeFromCollection.mutate(id)}
                  onDelete={(id) => deleteVoice.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* VOICE LIBRARY */}
        <TabsContent value="library" className="mt-6 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voices..."
                className="pl-9"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="confident">Confident</SelectItem>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="energetic">Energetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {libLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLibrary.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  mode="library"
                  onAdd={(id) => addToCollection.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* CLONE MY VOICE */}
        <TabsContent value="clone" className="mt-6">
          <CloneVoiceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
