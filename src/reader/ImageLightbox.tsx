interface Props {
  image: { src: string; alt: string } | null
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: Props) {
  if (!image) return null
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label="Image">
      <img src={image.src} alt={image.alt} onClick={(e) => e.stopPropagation()} />
      {image.alt ? <p className="caption">{image.alt}</p> : null}
      <button className="chip" onClick={onClose}>
        Close
      </button>
    </div>
  )
}
