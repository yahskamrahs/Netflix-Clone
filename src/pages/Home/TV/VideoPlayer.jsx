import { memo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaYoutube } from 'react-icons/fa';

const VideoPlayer = ({ videos, title }) => {
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        setShouldRender(false);
        const timer = setTimeout(() => setShouldRender(true), 150);
        return () => clearTimeout(timer);
    }, [videos]);

    // Find a trailer
    const trailer = videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                    videos?.find(v => v.site === 'YouTube');

    if (!trailer) {
        return (
            <div className="w-full flex items-center justify-center aspect-video bg-[#0a0c10] rounded-xl border border-white/5 shadow-2xl">
                <div className="text-center p-6">
                    <FaYoutube className="text-4xl text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Trailer not available</p>
                    <p className="text-xs text-gray-500 mt-1">We couldn't find an official trailer for this title.</p>
                </div>
            </div>
        );
    }

    const iframeSrc = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&rel=0&modestbranding=1`;
    
    return (
        <div className="w-full flex flex-col gap-3">
            {/* Player */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
                {shouldRender && (
                    <iframe
                        key={iframeSrc}
                        src={iframeSrc}
                        title={`${title || 'TV Show'} Trailer`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true"
                    />
                )}
            </div>
        </div>
    );
}

VideoPlayer.propTypes = {
    videos: PropTypes.array,
    title: PropTypes.string,
};

export default memo(VideoPlayer);